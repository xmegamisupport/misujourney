-- ---------- Journey Date rolls over at 04:00 local, not midnight ----------
--
-- calendar_date (customer_local_date, unchanged) is the literal local
-- calendar day. journey_date — what gates morning weigh-in / meals / water /
-- checkout — is that same day shifted back 4 hours, so e.g. 2026-07-16
-- 00:15–03:59 is still journey_date 2026-07-15 (the just-finished day stays
-- "current" until the customer would plausibly be awake for a fresh weigh-in).

create function public.customer_journey_date(p_customer_id uuid)
returns date
language sql
stable
set search_path = ''
as $$
  select ((now() at time zone coalesce((select timezone from public.profiles where id = p_customer_id), 'Asia/Kuala_Lumpur')) - interval '4 hours')::date;
$$;

revoke execute on function public.customer_journey_date(uuid) from public;
grant execute on function public.customer_journey_date(uuid) to authenticated;

create or replace function public.record_morning_checkin(
  p_checkin_id uuid,
  p_customer_id uuid,
  p_date date,
  p_weight numeric,
  p_poop_count public.poop_count,
  p_bedtime time,
  p_wake_time time
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is distinct from p_customer_id then
    raise exception '只能记录自己的晨重';
  end if;

  if p_date is distinct from public.customer_journey_date(p_customer_id) then
    raise exception '只能记录今天的晨重';
  end if;

  if exists (select 1 from public.daily_checkins where customer_id = p_customer_id and checkin_date = p_date) then
    return jsonb_build_object('ok', true, 'alreadyRecorded', true);
  end if;

  insert into public.daily_checkins (id, customer_id, checkin_date, weight, poop_count, bedtime, wake_time)
    values (p_checkin_id, p_customer_id, p_date, p_weight, p_poop_count, p_bedtime, p_wake_time);

  update public.daily_journeys set status = 'completed', updated_at = now()
    where customer_id = p_customer_id and status = 'active' and journey_date < p_date;

  insert into public.daily_journeys (customer_id, journey_date, status, started_at, start_method, morning_weight_status)
    values (p_customer_id, p_date, 'active', now(), 'morning_weight', 'completed')
  on conflict (customer_id, journey_date) do update
    set status = 'active',
        started_at = coalesce(public.daily_journeys.started_at, now()),
        start_method = 'morning_weight',
        morning_weight_status = 'completed',
        updated_at = now();

  return jsonb_build_object('ok', true, 'alreadyRecorded', false);
end;
$$;

create or replace function public.skip_morning_checkin(
  p_customer_id uuid,
  p_date date
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is distinct from p_customer_id then
    raise exception '只能操作自己的 Journey';
  end if;

  if p_date is distinct from public.customer_journey_date(p_customer_id) then
    raise exception '只能操作今天的 Journey';
  end if;

  if exists (select 1 from public.daily_journeys where customer_id = p_customer_id and journey_date = p_date) then
    return jsonb_build_object('ok', true, 'alreadyStarted', true);
  end if;

  update public.daily_journeys set status = 'completed', updated_at = now()
    where customer_id = p_customer_id and status = 'active' and journey_date < p_date;

  insert into public.daily_journeys (customer_id, journey_date, status, started_at, start_method, morning_weight_status)
    values (p_customer_id, p_date, 'active', now(), 'skipped_morning_weight', 'skipped');

  return jsonb_build_object('ok', true, 'alreadyStarted', false);
end;
$$;

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
  p_ai_advice text default ''
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.product_code;
  v_qty integer;
  v_remaining integer;
  v_new_remaining integer;
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

  insert into public.meals (id, customer_id, meal_type, misu_items, food_items, name, meal_time, photo_emoji, portion, calories, protein, carbs, fat, fiber, misu_score, good_points, improve_points, ai_advice)
    values (p_meal_id, p_customer_id, p_meal_type, p_misu_items, p_food_items, p_name, p_meal_time, p_photo_emoji, p_portion, p_calories, p_protein, p_carbs, p_fat, p_fiber, p_misu_score, p_good_points, p_improve_points, p_ai_advice);

  return jsonb_build_object('ok', true, 'alreadyRecorded', false);
end;
$$;

-- daily_evening_checkouts: catch-up-yesterday must keep working regardless
-- of today's journey status; only a same-journey-day checkout requires that
-- journey day to already be active. Bounds and comparisons now use the
-- 4am-shifted journey date instead of the plain calendar date.
drop policy "evening_checkouts_insert_own" on public.daily_evening_checkouts;

create policy "evening_checkouts_insert_own" on public.daily_evening_checkouts for insert
  with check (
    customer_id = auth.uid()
    and checkout_date between (public.customer_journey_date(auth.uid()) - 1) and public.customer_journey_date(auth.uid())
    and (
      checkout_date < public.customer_journey_date(auth.uid())
      or exists (
        select 1 from public.daily_journeys dj
        where dj.customer_id = auth.uid() and dj.journey_date = checkout_date and dj.status = 'active'
      )
    )
  );
