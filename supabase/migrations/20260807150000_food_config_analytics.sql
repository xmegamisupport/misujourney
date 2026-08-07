-- ═══════════════════════════════════════════════════════════════════════════
-- Food Library · Phase 3.3 (A) — Config + Recognition Analytics
--
-- • food_library_settings: single-row config (image limits + cleanup thresholds)
-- • food_recognition_daily: bounded per-food/day rollup (hits/estimates/conf)
-- • food_resolve v3: logs every recognition (hit or miss) into the rollup
-- • food_recognition_analytics(): per-food + open-miss dashboard stats
-- Additive; recognition never depends on this (logging is best-effort).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Config (no hardcoded limits anywhere) ───────────────────────────────────
create table if not exists public.food_library_settings (
  id                        boolean primary key default true check (id),  -- single row
  representative_image_limit integer not null default 10,
  verified_image_limit       integer not null default 5,
  cleanup_inactive_days      integer not null default 90,
  high_confidence_threshold  numeric not null default 0.90,
  updated_at                 timestamptz not null default now()
);
insert into public.food_library_settings (id) values (true) on conflict (id) do nothing;

alter table public.food_library_settings enable row level security;
create policy food_settings_select_staff on public.food_library_settings for select to authenticated using (public.food_can_edit());
create policy food_settings_update_admin on public.food_library_settings for update to authenticated using (public.food_is_admin()) with check (public.food_is_admin());

-- ── Analytics rollup (one row per food/day or per miss/day) ─────────────────
create table if not exists public.food_recognition_daily (
  day            date not null default current_date,
  food_id        uuid references public.foods(id) on delete cascade,
  miss_norm      text,
  hits           integer not null default 0,
  estimates      integer not null default 0,
  confidence_sum numeric not null default 0,
  confidence_n   integer not null default 0,
  check ((food_id is not null) <> (miss_norm is not null))  -- exactly one key
);
create unique index if not exists uq_food_rec_daily_food on public.food_recognition_daily (day, food_id) where food_id is not null;
create unique index if not exists uq_food_rec_daily_miss on public.food_recognition_daily (day, miss_norm) where miss_norm is not null;
create index if not exists idx_food_rec_daily_day on public.food_recognition_daily (day);

alter table public.food_recognition_daily enable row level security;
create policy food_rec_daily_select_staff on public.food_recognition_daily for select to authenticated using (public.food_can_edit());

-- Best-effort recognition logger (called from food_resolve).
create or replace function public._food_rec_log(p_food_id uuid, p_norm text, p_conf numeric, p_hit boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.food_recognition_daily
     set hits           = hits + (case when p_hit then 1 else 0 end),
         estimates      = estimates + (case when p_hit then 0 else 1 end),
         confidence_sum = confidence_sum + coalesce(p_conf, 0),
         confidence_n   = confidence_n + (case when p_conf is not null then 1 else 0 end)
   where day = current_date
     and food_id is not distinct from p_food_id
     and miss_norm is not distinct from p_norm;
  if not found then
    insert into public.food_recognition_daily (day, food_id, miss_norm, hits, estimates, confidence_sum, confidence_n)
      values (current_date, p_food_id, p_norm,
              case when p_hit then 1 else 0 end, case when p_hit then 0 else 1 end,
              coalesce(p_conf, 0), case when p_conf is not null then 1 else 0 end);
  end if;
end;
$$;

-- ── food_resolve v3: same as 3.2 + analytics logging on hit/miss ────────────
create or replace function public.food_resolve(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb; v_name text; v_conf numeric; v_norm text;
  v_food public.foods; v_nut public.food_nutrition; v_portion jsonb;
  v_has_similar boolean; v_results jsonb := '[]'::jsonb;
  v_est jsonb; v_rtype text; v_fsource text; v_components jsonb;
  v_sug_nut jsonb; v_serv_g numeric; v_serv_name text; v_aliases text[];
  v_miss_id uuid;
begin
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_name := trim(coalesce(v_item->>'name', ''));
    v_conf := nullif(v_item->>'confidence', '')::numeric;
    if v_name = '' then continue; end if;
    v_norm := public.food_normalize(v_name);

    select f.* into v_food
      from public.food_aliases a join public.foods f on f.id = a.food_id
     where a.normalized_key = v_norm and f.status = 'active'
     order by a.priority asc limit 1;

    if v_food.id is not null then
      select * into v_nut from public.food_nutrition where food_id = v_food.id and is_current and basis = 'per_serving' limit 1;
      if v_nut.id is null then
        select * into v_nut from public.food_nutrition where food_id = v_food.id and is_current and basis = 'per_100g' limit 1;
      end if;
      if v_nut.id is not null then
        v_portion := case when v_nut.basis = 'per_serving'
          then jsonb_build_object('gram', v_nut.serving_g, 'portionLabel', coalesce(v_nut.serving_name, '1 份'),
                 'calories', v_nut.calories, 'protein', v_nut.protein, 'carbohydrate', v_nut.carbohydrate, 'fat', v_nut.fat, 'fiber', v_nut.fiber)
          else jsonb_build_object('gram', 100, 'portionLabel', '100g',
                 'calories', v_nut.calories, 'protein', v_nut.protein, 'carbohydrate', v_nut.carbohydrate, 'fat', v_nut.fat, 'fiber', v_nut.fiber)
          end;
        perform public._food_rec_log(v_food.id, null, v_conf, true);   -- analytics: verified hit
        v_results := v_results || jsonb_build_object('name', v_name, 'matched', true, 'foodId', v_food.id,
          'canonicalName', v_food.canonical_name, 'plateCategory', v_food.plate_category, 'portion', v_portion);
        continue;
      end if;
      v_results := v_results || jsonb_build_object('name', v_name, 'matched', false);
      continue;
    end if;

    -- MISS
    perform public._food_rec_log(null, v_norm, v_conf, false);          -- analytics: estimate
    v_est := case when jsonb_typeof(v_item->'estimate') = 'object' then v_item->'estimate' else null end;
    v_rtype := v_item->>'recognitionType';
    v_fsource := coalesce(v_item->>'firstSeenSource', 'ai_photo');
    if v_fsource not in ('ai_photo','barcode','nutrition_label','manual') then v_fsource := 'ai_photo'; end if;
    v_components := case when jsonb_typeof(v_item->'components') = 'array' then v_item->'components' else null end;
    v_aliases := case when jsonb_typeof(v_item->'aliases') = 'array' then array(select jsonb_array_elements_text(v_item->'aliases')) else null end;
    v_sug_nut := case when v_est is not null then jsonb_build_object('calories', v_est->'calories', 'protein', v_est->'protein',
        'carbohydrate', v_est->'carbohydrate', 'fat', v_est->'fat', 'fiber', v_est->'fiber') else null end;
    v_serv_g := nullif(v_est->>'servingG', '')::numeric;
    v_serv_name := v_est->>'servingName';
    v_has_similar := exists (select 1 from public.food_aliases a where a.normalized_key = v_norm);

    select id into v_miss_id from public.food_match_misses where normalized_name = v_norm and status in ('new','reviewing') limit 1;
    if v_miss_id is not null then
      update public.food_match_misses
         set occurrences=occurrences+1, last_seen_at=now(), confidence=coalesce(v_conf, confidence),
             priority_score=public.food_inbox_priority(occurrences+1, now(), coalesce(v_conf, confidence), v_has_similar),
             suggested_nutrition=coalesce(suggested_nutrition, v_sug_nut), suggested_serving_g=coalesce(suggested_serving_g, v_serv_g),
             suggested_serving_name=coalesce(suggested_serving_name, v_serv_name), suggested_components=coalesce(suggested_components, v_components),
             suggested_aliases=coalesce(suggested_aliases, v_aliases), recognition_type=coalesce(recognition_type, v_rtype)
       where id = v_miss_id;
    else
      insert into public.food_match_misses (original_name, normalized_name, confidence, occurrences, last_seen_at, status, priority_score,
        first_seen_source, recognition_type, suggested_nutrition, suggested_serving_g, suggested_serving_name, suggested_components, suggested_aliases)
      values (v_name, v_norm, v_conf, 1, now(), 'new', public.food_inbox_priority(1, now(), v_conf, v_has_similar),
        v_fsource, v_rtype, v_sug_nut, v_serv_g, v_serv_name, v_components, v_aliases)
      returning id into v_miss_id;
    end if;

    v_results := v_results || jsonb_build_object('name', v_name, 'matched', false, 'missId', v_miss_id);
  end loop;
  return v_results;
end;
$$;
grant execute on function public.food_resolve(jsonb) to authenticated;
revoke execute on function public.food_resolve(jsonb) from anon;

-- ── Analytics dashboard: published foods + open misses, ranked by total ─────
create or replace function public.food_recognition_analytics(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_rows jsonb;
begin
  if not public.food_can_edit() then raise exception '需要 Food 团队权限'; end if;
  with published as (
    select f.id as food_id, f.canonical_name as name, true as verified_food,
      -- verified hits by food_id + estimate history by the food's alias norms
      coalesce((select sum(hits) from public.food_recognition_daily d where d.food_id = f.id), 0) as verified,
      coalesce((select sum(estimates) from public.food_recognition_daily d
                 where d.miss_norm in (select normalized_key from public.food_aliases where food_id = f.id)), 0) as estimate,
      coalesce((select sum(confidence_sum) from public.food_recognition_daily d
                 where d.food_id = f.id or d.miss_norm in (select normalized_key from public.food_aliases where food_id = f.id)), 0) as conf_sum,
      coalesce((select sum(confidence_n) from public.food_recognition_daily d
                 where d.food_id = f.id or d.miss_norm in (select normalized_key from public.food_aliases where food_id = f.id)), 0) as conf_n,
      coalesce((select sum(hits + estimates) from public.food_recognition_daily d
                 where (d.food_id = f.id or d.miss_norm in (select normalized_key from public.food_aliases where food_id = f.id))
                   and d.day >= current_date - 30), 0) as last30
    from public.foods f where f.status = 'active'
  ),
  open_miss as (
    select null::uuid as food_id, m.original_name as name, false as verified_food,
      0 as verified,
      coalesce((select sum(estimates) from public.food_recognition_daily d where d.miss_norm = m.normalized_name), 0) as estimate,
      coalesce((select sum(confidence_sum) from public.food_recognition_daily d where d.miss_norm = m.normalized_name), 0) as conf_sum,
      coalesce((select sum(confidence_n) from public.food_recognition_daily d where d.miss_norm = m.normalized_name), 0) as conf_n,
      coalesce((select sum(hits + estimates) from public.food_recognition_daily d where d.miss_norm = m.normalized_name and d.day >= current_date - 30), 0) as last30
    from public.food_match_misses m where m.status in ('new','reviewing')
  ),
  unioned as (select * from published union all select * from open_miss)
  select jsonb_agg(row_to_json(t)) into v_rows from (
    select food_id, name, verified_food,
      (verified + estimate) as total, verified, estimate,
      case when (verified + estimate) > 0 then round(verified::numeric / (verified + estimate) * 100, 1) else 0 end as verified_hit_rate,
      case when conf_n > 0 then round(conf_sum::numeric / conf_n * 100, 1) else null end as avg_confidence,
      last30 as last_30_days
    from unioned
    where (verified + estimate) > 0
    order by (verified + estimate) desc
    limit greatest(p_limit, 1)
  ) t;
  return coalesce(v_rows, '[]'::jsonb);
end;
$$;
revoke execute on function public.food_recognition_analytics(integer) from anon;
