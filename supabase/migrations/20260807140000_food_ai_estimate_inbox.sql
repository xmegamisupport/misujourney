-- ═══════════════════════════════════════════════════════════════════════════
-- Food Library · Phase 3.2 — AI Estimate + Recognition Inbox Intelligence
--
-- Makes the Library self-growing: a miss no longer just logs a name — it stores
-- an AI-suggested draft (nutrition/serving/components/aliases) so a Reviewer can
-- publish it in one step. Adds first_seen_source (entry channel analytics).
-- Fully additive; the meal flow still works if any of this is empty/unavailable.
-- ═══════════════════════════════════════════════════════════════════════════

-- AI-estimate source (unverified; lowest priority). is_active so drafts attach.
insert into public.food_sources (code, name, priority, license, website, is_active) values
  ('ai_estimate', 'AI Estimate', 10, 'AI-generated estimate (unverified)', null, true)
on conflict (code) do nothing;

-- Recognition Inbox intelligence columns.
alter table public.food_match_misses
  add column if not exists first_seen_source text not null default 'ai_photo'
    check (first_seen_source in ('ai_photo','barcode','nutrition_label','manual')),
  add column if not exists recognition_type      text,
  add column if not exists suggested_nutrition    jsonb,     -- {calories,protein,carbohydrate,fat,fiber}
  add column if not exists suggested_serving_g     numeric,
  add column if not exists suggested_serving_name  text,
  add column if not exists suggested_components    jsonb,
  add column if not exists suggested_aliases       text[];

-- ── food_resolve v2: match, else log a MISS with the AI suggested draft ──────
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
      select * into v_nut from public.food_nutrition
        where food_id = v_food.id and is_current and basis = 'per_serving' limit 1;
      if v_nut.id is null then
        select * into v_nut from public.food_nutrition
          where food_id = v_food.id and is_current and basis = 'per_100g' limit 1;
      end if;
      if v_nut.id is not null then
        v_portion := case when v_nut.basis = 'per_serving'
          then jsonb_build_object('gram', v_nut.serving_g, 'portionLabel', coalesce(v_nut.serving_name, '1 份'),
                 'calories', v_nut.calories, 'protein', v_nut.protein, 'carbohydrate', v_nut.carbohydrate, 'fat', v_nut.fat, 'fiber', v_nut.fiber)
          else jsonb_build_object('gram', 100, 'portionLabel', '100g',
                 'calories', v_nut.calories, 'protein', v_nut.protein, 'carbohydrate', v_nut.carbohydrate, 'fat', v_nut.fat, 'fiber', v_nut.fiber)
          end;
        v_results := v_results || jsonb_build_object('name', v_name, 'matched', true, 'foodId', v_food.id,
          'canonicalName', v_food.canonical_name, 'plateCategory', v_food.plate_category, 'portion', v_portion);
        continue;
      end if;
      -- food exists but no nutrition → fall back, don't pollute the inbox
      v_results := v_results || jsonb_build_object('name', v_name, 'matched', false);
      continue;
    end if;

    -- MISS → build the AI suggested draft from this item.
    v_est := case when jsonb_typeof(v_item->'estimate') = 'object' then v_item->'estimate' else null end;
    v_rtype := v_item->>'recognitionType';
    v_fsource := coalesce(v_item->>'firstSeenSource', 'ai_photo');
    if v_fsource not in ('ai_photo','barcode','nutrition_label','manual') then v_fsource := 'ai_photo'; end if;
    v_components := case when jsonb_typeof(v_item->'components') = 'array' then v_item->'components' else null end;
    v_aliases := case when jsonb_typeof(v_item->'aliases') = 'array' then array(select jsonb_array_elements_text(v_item->'aliases')) else null end;
    v_sug_nut := case when v_est is not null then jsonb_build_object(
        'calories', v_est->'calories', 'protein', v_est->'protein', 'carbohydrate', v_est->'carbohydrate',
        'fat', v_est->'fat', 'fiber', v_est->'fiber') else null end;
    v_serv_g := nullif(v_est->>'servingG', '')::numeric;
    v_serv_name := v_est->>'servingName';
    v_has_similar := exists (select 1 from public.food_aliases a where a.normalized_key = v_norm);

    select id into v_miss_id from public.food_match_misses
      where normalized_name = v_norm and status in ('new','reviewing') limit 1;

    if v_miss_id is not null then
      -- Same food seen again: bump occurrence, refresh last_seen + priority;
      -- fill the suggestion only if it was empty (keep the first good draft).
      update public.food_match_misses
         set occurrences   = occurrences + 1,
             last_seen_at   = now(),
             confidence     = coalesce(v_conf, confidence),
             priority_score = public.food_inbox_priority(occurrences + 1, now(), coalesce(v_conf, confidence), v_has_similar),
             suggested_nutrition   = coalesce(suggested_nutrition, v_sug_nut),
             suggested_serving_g   = coalesce(suggested_serving_g, v_serv_g),
             suggested_serving_name= coalesce(suggested_serving_name, v_serv_name),
             suggested_components  = coalesce(suggested_components, v_components),
             suggested_aliases     = coalesce(suggested_aliases, v_aliases),
             recognition_type      = coalesce(recognition_type, v_rtype)
       where id = v_miss_id;
    else
      insert into public.food_match_misses (
        original_name, normalized_name, confidence, occurrences, last_seen_at, status, priority_score,
        first_seen_source, recognition_type, suggested_nutrition, suggested_serving_g, suggested_serving_name,
        suggested_components, suggested_aliases)
      values (v_name, v_norm, v_conf, 1, now(), 'new',
        public.food_inbox_priority(1, now(), v_conf, v_has_similar),
        v_fsource, v_rtype, v_sug_nut, v_serv_g, v_serv_name, v_components, v_aliases);
    end if;

    v_results := v_results || jsonb_build_object('name', v_name, 'matched', false);
  end loop;
  return v_results;
end;
$$;
grant execute on function public.food_resolve(jsonb) to authenticated;
revoke execute on function public.food_resolve(jsonb) from anon;

-- ── Reviewer one-step publish from the inbox (review → modify → publish) ─────
-- Creates an ACTIVE canonical food + aliases + current nutrition from the AI
-- suggestion (editable via p_overrides), so future recognition = MISU Verified.
create or replace function public.food_inbox_publish(p_id uuid, p_overrides jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_miss public.food_match_misses; v_food uuid; v_src uuid; v_nut jsonb;
  v_name text; v_alias text; v_norm text; v_serv_g numeric; v_serv_name text;
begin
  if not public.food_can_review() then raise exception '需要 Food Reviewer 权限'; end if;
  select * into v_miss from public.food_match_misses where id = p_id for update;
  if v_miss.id is null then raise exception '收件箱条目不存在'; end if;
  if v_miss.status = 'published' then raise exception '该条目已发布'; end if;

  v_nut := coalesce(p_overrides->'nutrition', v_miss.suggested_nutrition);
  if v_nut is null then raise exception '缺少营养数据，无法发布'; end if;
  v_serv_g := coalesce(nullif(p_overrides->>'servingG','')::numeric, v_miss.suggested_serving_g, 100);
  v_serv_name := coalesce(p_overrides->>'servingName', v_miss.suggested_serving_name);
  -- Published by a reviewer ⇒ MISU-curated by default; override allowed.
  select id into v_src from public.food_sources where code = coalesce(p_overrides->>'source', 'manual');
  if v_src is null then raise exception '未知营养来源'; end if;

  v_name := coalesce(p_overrides->>'canonicalName', v_miss.original_name);
  insert into public.foods (canonical_name, cuisine, kind, plate_category, status)
    values (v_name, coalesce(p_overrides->>'cuisine','other'), coalesce(p_overrides->>'kind','dish'),
            p_overrides->>'plateCategory', 'active')
    returning id into v_food;

  -- Aliases: canonical name, the recognised name, and each suggested alias —
  -- skipping any that already belong to another non-merged food.
  foreach v_alias in array (array[v_name, v_miss.original_name] || coalesce(v_miss.suggested_aliases, '{}'))
  loop
    v_norm := public.food_normalize(v_alias);
    if v_norm = '' then continue; end if;
    if exists (select 1 from public.food_aliases a join public.foods f on f.id = a.food_id
               where a.normalized_key = v_norm and a.food_id <> v_food and f.status <> 'merged') then
      continue;
    end if;
    insert into public.food_aliases (food_id, alias, normalized_key, language, match_type)
      values (v_food, v_alias, v_norm, 'other', case when v_alias = v_name then 'canonical' else 'ai' end)
    on conflict (food_id, normalized_key) do nothing;
  end loop;

  insert into public.food_nutrition (food_id, source_id, basis, serving_g, serving_name, calories, protein, carbohydrate, fat, fiber, is_current)
    values (v_food, v_src, 'per_serving', v_serv_g, v_serv_name,
      coalesce((v_nut->>'calories')::numeric, 0), coalesce((v_nut->>'protein')::numeric, 0),
      coalesce((v_nut->>'carbohydrate')::numeric, 0), coalesce((v_nut->>'fat')::numeric, 0),
      coalesce((v_nut->>'fiber')::numeric, 0), true);

  update public.food_match_misses set status='published', resolved_food_id=v_food, reviewed_by=auth.uid(), reviewed_at=now() where id = p_id;
  perform public._food_audit('inbox.publish', 'food', v_food, null, jsonb_build_object('miss', p_id, 'source', coalesce(p_overrides->>'source','manual')));
  return v_food;
end;
$$;
revoke execute on function public.food_inbox_publish(uuid, jsonb) from anon;
