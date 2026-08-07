-- ═══════════════════════════════════════════════════════════════════════════
-- Food Library · Phase 2A Sprint 3 — Recognition Adapter (food_resolve)
--
-- Resolves AI-recognised names against the Food Library:
--   • exact alias match (normalized) → ACTIVE canonical food + current nutrition
--     (prefer per_serving, else per_100g) → returns a ready-to-use portion
--   • no matching food → logs the name to the Recognition Inbox (upsert by
--     normalized_name, occurrences++, priority recomputed) → returns matched:false
--   • food exists but has no nutrition yet → matched:false, NOT logged (it isn't
--     a "missing food", just incomplete data)
--
-- Read-only for the caller's meal flow + best-effort inbox logging. If the
-- library is empty, every name misses → the caller falls back to food_portions,
-- i.e. exactly today's behaviour. Callable by authenticated users.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.food_resolve(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_name text;
  v_conf numeric;
  v_norm text;
  v_food public.foods;
  v_nut public.food_nutrition;
  v_portion jsonb;
  v_has_similar boolean;
  v_results jsonb := '[]'::jsonb;
begin
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_name := trim(coalesce(v_item->>'name', ''));
    v_conf := nullif(v_item->>'confidence', '')::numeric;
    if v_name = '' then continue; end if;
    v_norm := public.food_normalize(v_name);

    -- Exact alias match against an ACTIVE canonical food (lowest alias.priority wins).
    select f.* into v_food
      from public.food_aliases a
      join public.foods f on f.id = a.food_id
     where a.normalized_key = v_norm and f.status = 'active'
     order by a.priority asc
     limit 1;

    if v_food.id is not null then
      select * into v_nut from public.food_nutrition
        where food_id = v_food.id and is_current and basis = 'per_serving' limit 1;
      if v_nut.id is null then
        select * into v_nut from public.food_nutrition
          where food_id = v_food.id and is_current and basis = 'per_100g' limit 1;
      end if;

      if v_nut.id is not null then
        if v_nut.basis = 'per_serving' then
          v_portion := jsonb_build_object(
            'gram', v_nut.serving_g, 'portionLabel', coalesce(v_nut.serving_name, '1 份'),
            'calories', v_nut.calories, 'protein', v_nut.protein,
            'carbohydrate', v_nut.carbohydrate, 'fat', v_nut.fat, 'fiber', v_nut.fiber);
        else
          v_portion := jsonb_build_object(
            'gram', 100, 'portionLabel', '100g',
            'calories', v_nut.calories, 'protein', v_nut.protein,
            'carbohydrate', v_nut.carbohydrate, 'fat', v_nut.fat, 'fiber', v_nut.fiber);
        end if;
        v_results := v_results || jsonb_build_object(
          'name', v_name, 'matched', true, 'foodId', v_food.id,
          'canonicalName', v_food.canonical_name, 'plateCategory', v_food.plate_category,
          'portion', v_portion);
        continue;
      end if;

      -- Food exists but no nutrition yet → fall back, don't pollute the inbox.
      v_results := v_results || jsonb_build_object('name', v_name, 'matched', false);
      continue;
    end if;

    -- No matching food → log to the Recognition Inbox (dedup by normalized_name).
    v_has_similar := exists (select 1 from public.food_aliases a where a.normalized_key = v_norm);
    update public.food_match_misses
       set occurrences   = occurrences + 1,
           last_seen_at   = now(),
           confidence     = coalesce(v_conf, confidence),
           priority_score = public.food_inbox_priority(occurrences + 1, now(), coalesce(v_conf, confidence), v_has_similar)
     where normalized_name = v_norm and status in ('new', 'reviewing');
    if not found then
      insert into public.food_match_misses (original_name, normalized_name, confidence, occurrences, last_seen_at, status, priority_score)
      values (v_name, v_norm, v_conf, 1, now(), 'new', public.food_inbox_priority(1, now(), v_conf, v_has_similar));
    end if;

    v_results := v_results || jsonb_build_object('name', v_name, 'matched', false);
  end loop;

  return v_results;
end;
$$;

grant execute on function public.food_resolve(jsonb) to authenticated;
revoke execute on function public.food_resolve(jsonb) from anon;
