-- ═══════════════════════════════════════════════════════════════════════════
-- 饮食打卡不再依赖晨重 — meal logging no longer requires the morning check-in.
--
-- Product decision: 饮水 + 饮食 are CONTINUOUS habits you may record any time of
-- day; only 今日晨重 and 今日学习 stay gated (晨重 by the 4am rollover, 学习 by
-- an active Journey Day). Water was already a direct RLS-scoped table write with
-- no server guard, so this migration only touches record_meal: it drops the
-- `status = 'active'` (i.e. "must weigh in first") check.
--
-- Everything else is byte-identical to the previous definition
-- (20260722140000_meal_photos.sql): self-ownership, MISU inventory deduction +
-- transaction log + alert, the server-rebuilt photo path, and idempotency by
-- p_meal_id are all preserved.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.record_meal(
  p_meal_id uuid,
  p_customer_id uuid,
  p_meal_type text,
  p_misu_items jsonb,
  p_food_items jsonb,
  p_name text,
  p_meal_time text,
  p_photo_emoji text,
  p_portion text,
  p_calories numeric,
  p_protein numeric,
  p_carbs numeric,
  p_fat numeric,
  p_fiber numeric,
  p_misu_score numeric,
  p_good_points text[],
  p_improve_points text[],
  p_ai_advice text default ''::text,
  p_photo_ext text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.product_code;
  v_qty integer;
  v_remaining integer;
  v_new_remaining integer;
  v_photo_path text;
begin
  if auth.uid() is distinct from p_customer_id then
    raise exception '只能记录自己的餐点';
  end if;

  -- (removed) journey-active guard: recording a meal no longer requires the
  -- morning check-in to be done first. 饮食是全天可记的习惯。

  if exists (select 1 from public.meals where id = p_meal_id) then
    return jsonb_build_object('ok', true, 'alreadyRecorded', true);
  end if;

  -- Rebuild the path from server-side values, then confirm the object exists.
  -- A missing or unverifiable upload is not an error: record the meal anyway
  -- and leave photo_path null. A lost picture must never cost her the meal.
  if p_photo_ext is not null and p_photo_ext ~ '^[a-z]{3,4}$' then
    v_photo_path := p_customer_id::text || '/' || p_meal_id::text || '.' || p_photo_ext;
    if not exists (
      select 1 from storage.objects
       where bucket_id = 'meal-photos' and name = v_photo_path
    ) then
      v_photo_path := null;
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_misu_items)
  loop
    v_product := (v_item ->> 'productCode')::public.product_code;
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty > 0 then
      select remaining_units into v_remaining
        from public.customer_inventory
        where customer_id = p_customer_id and product_code = v_product
        for update;
      v_remaining := coalesce(v_remaining, 0);
      if v_qty > v_remaining then
        raise exception '你的%目前只剩%包，无法记录使用%包，请检查数量或先更新回购库存。',
          case v_product when 'MISU_N_PLUS' then 'MISU N+ 代餐' else 'MISU DX+ 排毒' end,
          v_remaining, v_qty;
      end if;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(p_misu_items)
  loop
    v_product := (v_item ->> 'productCode')::public.product_code;
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty > 0 then
      update public.customer_inventory
        set total_used_units = total_used_units + v_qty,
            remaining_units = remaining_units - v_qty,
            updated_at = now()
        where customer_id = p_customer_id and product_code = v_product
        returning remaining_units into v_new_remaining;

      insert into public.inventory_transactions (customer_id, product_code, type, quantity_change, balance_after, related_record_id, note, created_by)
        values (p_customer_id, v_product, 'MEAL_USAGE', -v_qty, v_new_remaining, p_meal_id::text, 'Smart Meal Check 记录使用', 'customer');

      perform public._check_and_update_alert(p_customer_id, v_product, v_new_remaining);
    end if;
  end loop;

  insert into public.meals (id, customer_id, meal_type, misu_items, food_items, name, meal_time, photo_emoji, portion, calories, protein, carbs, fat, fiber, misu_score, good_points, improve_points, ai_advice, photo_path)
    values (p_meal_id, p_customer_id, p_meal_type, p_misu_items, p_food_items, p_name, p_meal_time, p_photo_emoji, p_portion, p_calories, p_protein, p_carbs, p_fat, p_fiber, p_misu_score, p_good_points, p_improve_points, p_ai_advice, v_photo_path);

  return jsonb_build_object('ok', true, 'alreadyRecorded', false, 'photoStored', v_photo_path is not null);
end;
$$;
