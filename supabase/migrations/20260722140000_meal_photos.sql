-- ═══════════════════════════════════════════════════════════════════════════
-- Meal photos — kept, so the coach can actually look at them.
--
-- Until now the meal photo was never stored anywhere: it was sent to the vision
-- model, used to produce the analysis, and then discarded with the browser tab.
-- `meals.photo_emoji` is a single emoji, not an image. So "the coach reviews the
-- photo" was not a missing screen — there was nothing behind it.
--
-- This is also the honest answer to meal-photo authenticity. Automated checks
-- can tell food from furniture, but they cannot tell whether the food is hers,
-- eaten now, and not a photo of a photo. A human who knows the customer can.
-- Storing the photo turns an unsolvable detection problem into an easy review
-- problem — and the coach is already looking at these customers every week.
--
-- Mirrors the body-progress-photos design exactly: private bucket, path
-- {customer_id}/{meal_id}.{ext}, customer writes only her own folder, coach and
-- admin read-only over their scope, and NO update or delete policy for anyone —
-- append-only, matching the tables.
--
-- The path is never accepted from the client. record_meal() takes only a file
-- extension and rebuilds the canonical path from trusted server-side values,
-- then checks storage.objects for it. "Does this path follow the convention"
-- becomes true by construction rather than by parsing, and "was the file really
-- uploaded" is verified in the same step.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "meal_photos_insert_own" on storage.objects
  for insert
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "meal_photos_select_own" on storage.objects
  for select
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "meal_photos_select_as_coach" on storage.objects
  for select
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] in (select id::text from public.profiles where coach_id = auth.uid()));

create policy "meal_photos_select_as_admin" on storage.objects
  for select
  using (bucket_id = 'meal-photos' and public.current_role() = 'admin');

-- Nullable on purpose. The photo lives in the browser as a blob URL through the
-- confirm and result steps; a mid-flow reload kills it. Losing the picture must
-- degrade to "meal recorded without a photo", never to "meal lost".
alter table public.meals add column if not exists photo_path text;

drop function if exists public.record_meal(uuid, uuid, text, jsonb, jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text[], text[], text);

create function public.record_meal(
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

  if not exists (
    select 1 from public.daily_journeys
    where customer_id = p_customer_id
      and journey_date = public.customer_journey_date(p_customer_id)
      and status = 'active'
  ) then
    raise exception '今天的 Journey 还没开始，请先完成或跳过晨重';
  end if;

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
