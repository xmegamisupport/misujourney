-- MISU Journey: inventory tracking system schema
-- Tables: profiles, customer_inventory, inventory_transactions, repurchase_alerts,
-- daily_checkins, meals. All inventory-mutating writes go through SECURITY DEFINER
-- RPC functions so business rules (idempotency, insufficient-stock guard, alert
-- transitions) are enforced atomically in the database, not the client.

-- ---------- Enums ----------

create type public.user_role as enum ('customer', 'coach', 'admin');
create type public.product_code as enum ('MISU_N_PLUS', 'MISU_DX_PLUS');
create type public.inventory_transaction_type as enum (
  'INITIAL_PURCHASE',
  'CHECK_IN_USAGE',
  'MEAL_USAGE',
  'REPURCHASE',
  'MANUAL_ADJUSTMENT',
  'CHECK_IN_EDIT',
  'CHECK_IN_DELETE',
  'MANUAL_INITIAL_BALANCE'
);
create type public.repurchase_alert_status as enum ('OPEN', 'FOLLOWED_UP', 'COMPLETED', 'DISMISSED');
create type public.repurchase_alert_level as enum ('REPURCHASE_SOON', 'URGENT', 'OUT_OF_STOCK');
create type public.poop_count as enum ('0', '1', '2', '3+');

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  name text not null,
  avatar text,
  coach_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_inventory (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  product_code public.product_code not null,
  boxes_purchased integer not null default 0,
  units_per_box integer not null default 20,
  initial_units integer not null default 0,
  total_added_units integer not null default 0,
  total_used_units integer not null default 0,
  remaining_units integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, product_code),
  constraint remaining_units_non_negative check (remaining_units >= 0)
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  product_code public.product_code not null,
  type public.inventory_transaction_type not null,
  quantity_change integer not null,
  balance_after integer not null,
  related_record_id text,
  note text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index inventory_transactions_customer_product_idx on public.inventory_transactions (customer_id, product_code);
create index inventory_transactions_related_record_idx on public.inventory_transactions (related_record_id);

create table public.repurchase_alerts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  product_code public.product_code not null,
  status public.repurchase_alert_status not null default 'OPEN',
  alert_level public.repurchase_alert_level not null,
  remaining_units_when_triggered integer not null,
  triggered_at timestamptz not null default now(),
  followed_up_at timestamptz,
  followed_up_by uuid references public.profiles (id),
  completed_at timestamptz,
  note text
);

create index repurchase_alerts_customer_product_status_idx on public.repurchase_alerts (customer_id, product_code, status);

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  checkin_date date not null,
  weight numeric(5, 1) not null,
  poop_count public.poop_count not null,
  bedtime time not null,
  wake_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, checkin_date)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  meal_type text not null,
  misu_items jsonb not null default '[]'::jsonb,
  food_items jsonb not null default '[]'::jsonb,
  name text not null,
  meal_time text not null,
  photo_emoji text,
  portion text,
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric not null default 0,
  misu_score numeric not null default 0,
  good_points text[] not null default '{}',
  improve_points text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index meals_customer_created_idx on public.meals (customer_id, created_at desc);

-- ---------- Helper functions ----------

create or replace function public.current_role()
returns public.user_role
language sql security definer stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_inventory_alert_status(p_product_code public.product_code, p_remaining integer)
returns text
language plpgsql immutable
as $$
declare
  v_repurchase_soon integer;
  v_urgent integer;
begin
  if p_remaining <= 0 then
    return 'OUT_OF_STOCK';
  end if;

  if p_product_code = 'MISU_N_PLUS' then
    v_repurchase_soon := 10;
    v_urgent := 5;
  else
    v_repurchase_soon := 20;
    v_urgent := 10;
  end if;

  if p_remaining <= v_urgent then
    return 'URGENT';
  elsif p_remaining <= v_repurchase_soon then
    return 'REPURCHASE_SOON';
  else
    return 'SUFFICIENT';
  end if;
end;
$$;

create or replace function public._check_and_update_alert(p_customer_id uuid, p_product_code public.product_code, p_remaining integer)
returns void
language plpgsql security definer
as $$
declare
  v_status text;
  v_alert_id uuid;
begin
  v_status := public.get_inventory_alert_status(p_product_code, p_remaining);

  select id into v_alert_id
  from public.repurchase_alerts
  where customer_id = p_customer_id
    and product_code = p_product_code
    and status in ('OPEN', 'FOLLOWED_UP')
  limit 1;

  if v_status = 'SUFFICIENT' then
    if v_alert_id is not null then
      update public.repurchase_alerts
        set status = 'COMPLETED', completed_at = now()
        where id = v_alert_id;
    end if;
    return;
  end if;

  if v_alert_id is not null then
    update public.repurchase_alerts
      set alert_level = v_status::public.repurchase_alert_level, remaining_units_when_triggered = p_remaining
      where id = v_alert_id;
  else
    insert into public.repurchase_alerts (customer_id, product_code, status, alert_level, remaining_units_when_triggered)
      values (p_customer_id, p_product_code, 'OPEN', v_status::public.repurchase_alert_level, p_remaining);
  end if;
end;
$$;

create or replace function public._complete_alerts_for_repurchase(p_customer_id uuid, p_product_code public.product_code)
returns void
language plpgsql security definer
as $$
begin
  update public.repurchase_alerts
    set status = 'COMPLETED', completed_at = now()
    where customer_id = p_customer_id and product_code = p_product_code and status in ('OPEN', 'FOLLOWED_UP');
end;
$$;

-- ---------- Write RPCs ----------

create or replace function public.init_customer_inventory(
  p_customer_id uuid,
  p_boxes_n_plus integer,
  p_boxes_dx_plus integer
) returns void
language plpgsql security definer
as $$
declare
  v_units integer;
begin
  if auth.uid() is distinct from p_customer_id then
    raise exception '只能初始化自己的库存';
  end if;
  if p_boxes_n_plus < 0 or p_boxes_dx_plus < 0 then
    raise exception '购买盒数只能是 0 或正整数';
  end if;
  if p_boxes_n_plus = 0 and p_boxes_dx_plus = 0 then
    raise exception '至少一项产品的购买盒数必须大于 0';
  end if;

  if p_boxes_n_plus > 0 then
    v_units := p_boxes_n_plus * 20;
    insert into public.customer_inventory (customer_id, product_code, boxes_purchased, units_per_box, initial_units, total_added_units, total_used_units, remaining_units)
      values (p_customer_id, 'MISU_N_PLUS', p_boxes_n_plus, 20, v_units, v_units, 0, v_units)
      on conflict (customer_id, product_code) do update set
        boxes_purchased = excluded.boxes_purchased,
        initial_units = excluded.initial_units,
        total_added_units = excluded.total_added_units,
        total_used_units = 0,
        remaining_units = excluded.remaining_units,
        updated_at = now();
    insert into public.inventory_transactions (customer_id, product_code, type, quantity_change, balance_after, created_by)
      values (p_customer_id, 'MISU_N_PLUS', 'INITIAL_PURCHASE', v_units, v_units, 'customer');
  end if;

  if p_boxes_dx_plus > 0 then
    v_units := p_boxes_dx_plus * 20;
    insert into public.customer_inventory (customer_id, product_code, boxes_purchased, units_per_box, initial_units, total_added_units, total_used_units, remaining_units)
      values (p_customer_id, 'MISU_DX_PLUS', p_boxes_dx_plus, 20, v_units, v_units, 0, v_units)
      on conflict (customer_id, product_code) do update set
        boxes_purchased = excluded.boxes_purchased,
        initial_units = excluded.initial_units,
        total_added_units = excluded.total_added_units,
        total_used_units = 0,
        remaining_units = excluded.remaining_units,
        updated_at = now();
    insert into public.inventory_transactions (customer_id, product_code, type, quantity_change, balance_after, created_by)
      values (p_customer_id, 'MISU_DX_PLUS', 'INITIAL_PURCHASE', v_units, v_units, 'customer');
  end if;
end;
$$;

create or replace function public.init_legacy_balance(
  p_customer_id uuid,
  p_remaining_n_plus integer,
  p_remaining_dx_plus integer
) returns void
language plpgsql security definer
as $$
begin
  if auth.uid() is distinct from p_customer_id then
    raise exception '只能初始化自己的库存';
  end if;
  if p_remaining_n_plus < 0 or p_remaining_dx_plus < 0 then
    raise exception '剩余包数只能是 0 或正整数';
  end if;

  insert into public.customer_inventory (customer_id, product_code, boxes_purchased, units_per_box, initial_units, total_added_units, total_used_units, remaining_units)
    values
      (p_customer_id, 'MISU_N_PLUS', 0, 20, p_remaining_n_plus, p_remaining_n_plus, 0, p_remaining_n_plus),
      (p_customer_id, 'MISU_DX_PLUS', 0, 20, p_remaining_dx_plus, p_remaining_dx_plus, 0, p_remaining_dx_plus)
    on conflict (customer_id, product_code) do nothing;

  insert into public.inventory_transactions (customer_id, product_code, type, quantity_change, balance_after, note, created_by)
    values
      (p_customer_id, 'MISU_N_PLUS', 'MANUAL_INITIAL_BALANCE', p_remaining_n_plus, p_remaining_n_plus, '旧顾客首次补登目前剩余库存', 'customer'),
      (p_customer_id, 'MISU_DX_PLUS', 'MANUAL_INITIAL_BALANCE', p_remaining_dx_plus, p_remaining_dx_plus, '旧顾客首次补登目前剩余库存', 'customer');

  perform public._check_and_update_alert(p_customer_id, 'MISU_N_PLUS', p_remaining_n_plus);
  perform public._check_and_update_alert(p_customer_id, 'MISU_DX_PLUS', p_remaining_dx_plus);
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
  p_improve_points text[]
) returns jsonb
language plpgsql security definer
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

  insert into public.meals (id, customer_id, meal_type, misu_items, food_items, name, meal_time, photo_emoji, portion, calories, protein, carbs, fat, fiber, misu_score, good_points, improve_points)
    values (p_meal_id, p_customer_id, p_meal_type, p_misu_items, p_food_items, p_name, p_meal_time, p_photo_emoji, p_portion, p_calories, p_protein, p_carbs, p_fat, p_fiber, p_misu_score, p_good_points, p_improve_points);

  return jsonb_build_object('ok', true, 'alreadyRecorded', false);
end;
$$;

create or replace function public.record_repurchase(
  p_customer_id uuid,
  p_product_code public.product_code,
  p_boxes integer,
  p_date date,
  p_note text
) returns void
language plpgsql security definer
as $$
declare
  v_units integer;
  v_new_remaining integer;
  v_role public.user_role;
begin
  v_role := public.current_role();
  if v_role not in ('coach', 'admin') then
    raise exception '只有 Coach 或管理员可以新增回购';
  end if;
  if p_boxes <= 0 then
    raise exception '回购盒数必须是大于 0 的整数';
  end if;

  v_units := p_boxes * 20;

  insert into public.customer_inventory (customer_id, product_code, boxes_purchased, units_per_box, initial_units, total_added_units, total_used_units, remaining_units)
    values (p_customer_id, p_product_code, p_boxes, 20, 0, v_units, 0, v_units)
    on conflict (customer_id, product_code) do update set
      boxes_purchased = customer_inventory.boxes_purchased + p_boxes,
      total_added_units = customer_inventory.total_added_units + v_units,
      remaining_units = customer_inventory.remaining_units + v_units,
      updated_at = now()
    returning remaining_units into v_new_remaining;

  insert into public.inventory_transactions (customer_id, product_code, type, quantity_change, balance_after, note, created_by, created_at)
    values (p_customer_id, p_product_code, 'REPURCHASE', v_units, v_new_remaining, p_note, auth.uid()::text, coalesce(p_date::timestamptz, now()));

  perform public._complete_alerts_for_repurchase(p_customer_id, p_product_code);
end;
$$;

create or replace function public.manual_adjustment(
  p_customer_id uuid,
  p_product_code public.product_code,
  p_delta integer,
  p_reason text
) returns void
language plpgsql security definer
as $$
declare
  v_role public.user_role;
  v_current integer;
  v_new_remaining integer;
begin
  v_role := public.current_role();
  if v_role not in ('coach', 'admin') then
    raise exception '只有 Coach 或管理员可以手动调整库存';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception '调整原因为必填';
  end if;
  if p_delta = 0 then
    raise exception '调整数量必须是不为 0 的整数';
  end if;

  insert into public.customer_inventory (customer_id, product_code, boxes_purchased, units_per_box, initial_units, total_added_units, total_used_units, remaining_units)
    values (p_customer_id, p_product_code, 0, 20, 0, 0, 0, 0)
    on conflict (customer_id, product_code) do nothing;

  select remaining_units into v_current
    from public.customer_inventory
    where customer_id = p_customer_id and product_code = p_product_code
    for update;

  if v_current + p_delta < 0 then
    raise exception '调整后库存不能小于 0（目前剩余 % 包）', v_current;
  end if;

  update public.customer_inventory
    set remaining_units = v_current + p_delta,
        total_added_units = total_added_units + greatest(p_delta, 0),
        total_used_units = total_used_units + greatest(-p_delta, 0),
        updated_at = now()
    where customer_id = p_customer_id and product_code = p_product_code
    returning remaining_units into v_new_remaining;

  insert into public.inventory_transactions (customer_id, product_code, type, quantity_change, balance_after, note, created_by)
    values (p_customer_id, p_product_code, 'MANUAL_ADJUSTMENT', p_delta, v_new_remaining, p_reason, auth.uid()::text);

  perform public._check_and_update_alert(p_customer_id, p_product_code, v_new_remaining);
end;
$$;

create or replace function public.mark_alert_followed_up(p_alert_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_role public.user_role;
begin
  v_role := public.current_role();
  if v_role not in ('coach', 'admin') then
    raise exception '只有 Coach 或管理员可以标记已跟进';
  end if;
  update public.repurchase_alerts
    set status = 'FOLLOWED_UP', followed_up_at = now(), followed_up_by = auth.uid()
    where id = p_alert_id;
end;
$$;

grant execute on function public.init_customer_inventory(uuid, integer, integer) to authenticated;
grant execute on function public.init_legacy_balance(uuid, integer, integer) to authenticated;
grant execute on function public.record_meal(uuid, uuid, text, jsonb, jsonb, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text[], text[]) to authenticated;
grant execute on function public.record_repurchase(uuid, public.product_code, integer, date, text) to authenticated;
grant execute on function public.manual_adjustment(uuid, public.product_code, integer, text) to authenticated;
grant execute on function public.mark_alert_followed_up(uuid) to authenticated;

-- ---------- Auth trigger: create a profile row on signup ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, role, name, avatar)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer'),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.customer_inventory enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.repurchase_alerts enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.meals enable row level security;

-- profiles
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_select_as_coach" on public.profiles for select using (coach_id = auth.uid());
create policy "profiles_select_as_admin" on public.profiles for select using (public.current_role() = 'admin');
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());

-- customer_inventory (read-only for clients; all writes via RPC above)
create policy "inventory_select_own" on public.customer_inventory for select using (customer_id = auth.uid());
create policy "inventory_select_as_coach" on public.customer_inventory for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "inventory_select_as_admin" on public.customer_inventory for select using (public.current_role() = 'admin');

-- inventory_transactions (read-only for clients)
create policy "tx_select_own" on public.inventory_transactions for select using (customer_id = auth.uid());
create policy "tx_select_as_coach" on public.inventory_transactions for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "tx_select_as_admin" on public.inventory_transactions for select using (public.current_role() = 'admin');

-- repurchase_alerts (coach/admin only — not customer-visible per spec)
create policy "alerts_select_as_coach" on public.repurchase_alerts for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "alerts_select_as_admin" on public.repurchase_alerts for select using (public.current_role() = 'admin');

-- daily_checkins (no inventory side effects, so plain CRUD is safe under RLS)
create policy "checkins_select_own" on public.daily_checkins for select using (customer_id = auth.uid());
create policy "checkins_select_as_coach" on public.daily_checkins for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "checkins_select_as_admin" on public.daily_checkins for select using (public.current_role() = 'admin');
create policy "checkins_insert_own" on public.daily_checkins for insert with check (customer_id = auth.uid());
create policy "checkins_update_own" on public.daily_checkins for update using (customer_id = auth.uid());
create policy "checkins_delete_own" on public.daily_checkins for delete using (customer_id = auth.uid());

-- meals (read-only for clients; all inserts via record_meal RPC)
create policy "meals_select_own" on public.meals for select using (customer_id = auth.uid());
create policy "meals_select_as_coach" on public.meals for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "meals_select_as_admin" on public.meals for select using (public.current_role() = 'admin');
