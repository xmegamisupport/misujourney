-- Coach Capability — Phase 6.1: SECURITY DEFINER write-RPC hardening.
--
-- Phase 6 hardened the RLS read/write POLICIES, but three SECURITY DEFINER
-- write RPCs still authorized on role='coach' (a base-tier check, not the
-- capability) AND performed no assignment-ownership check — so a revoked
-- legacy coach could still call them, and any coach could pass an arbitrary
-- p_customer_id to mutate a customer they were never assigned. This phase
-- closes both gaps for every Coach write RPC:
--   manual_adjustment, record_repurchase, mark_alert_followed_up.
--
-- New rule for every Coach write:
--   Admin           -> allowed (bypasses assignment, unchanged behaviour)
--   Active Coach    -> allowed ONLY for their own assigned customers
--                      (is_active_coach() AND customer.coach_id = auth.uid())
--   anyone else     -> denied
--
-- Only the authorization guard changes; all inventory / alert logic is
-- preserved byte-for-byte from the live definitions.

-- ---------- Shared authorization predicate ----------
-- SECURITY DEFINER so the assignment lookup is not itself subject to RLS.
create or replace function public.coach_can_manage_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.current_role() = 'admin'::public.user_role
    or (
      public.is_active_coach()
      and exists (
        select 1 from public.profiles
        where id = p_customer_id and coach_id = auth.uid()
      )
    );
$$;

revoke execute on function public.coach_can_manage_customer(uuid) from anon, public;
grant execute on function public.coach_can_manage_customer(uuid) to authenticated;

-- ---------- manual_adjustment ----------
create or replace function public.manual_adjustment(p_customer_id uuid, p_product_code product_code, p_delta integer, p_reason text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_current integer;
  v_new_remaining integer;
begin
  if not public.coach_can_manage_customer(p_customer_id) then
    raise exception '只有该顾客的教练或管理员可以手动调整库存';
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
$function$;

-- ---------- record_repurchase ----------
create or replace function public.record_repurchase(p_customer_id uuid, p_product_code product_code, p_boxes integer, p_date date, p_note text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_units integer;
  v_new_remaining integer;
begin
  if not public.coach_can_manage_customer(p_customer_id) then
    raise exception '只有该顾客的教练或管理员可以新增回购';
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
$function$;

-- ---------- mark_alert_followed_up ----------
-- The target is an alert id; resolve its customer, then apply the same
-- capability + assignment rule against that customer.
create or replace function public.mark_alert_followed_up(p_alert_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_customer uuid;
begin
  select customer_id into v_customer from public.repurchase_alerts where id = p_alert_id;
  if v_customer is null then
    raise exception '找不到该提醒';
  end if;
  if not public.coach_can_manage_customer(v_customer) then
    raise exception '只有该顾客的教练或管理员可以标记已跟进';
  end if;
  update public.repurchase_alerts
    set status = 'FOLLOWED_UP', followed_up_at = now(), followed_up_by = auth.uid()
    where id = p_alert_id;
end;
$function$;
