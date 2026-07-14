-- profiles has no admin-wide UPDATE policy (only profiles_update_own), so
-- Admin reassigning a customer's coach must go through a SECURITY DEFINER
-- RPC — same "writes go through RPCs, not raw client UPDATEs" convention
-- as update_coach_whatsapp_contact() etc.
create or replace function public.admin_set_customer_coach(p_customer_id uuid, p_coach_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_customer_role public.user_role;
  v_coach_role public.user_role;
begin
  if public.current_role() <> 'admin' then
    raise exception '只有 Admin 可以调整顾客的负责教练';
  end if;

  select role into v_customer_role from public.profiles where id = p_customer_id;
  if v_customer_role is null then
    raise exception '找不到这位顾客';
  end if;
  if v_customer_role <> 'customer' then
    raise exception '只能给顾客账号设置负责教练';
  end if;

  if p_coach_id is not null then
    select role into v_coach_role from public.profiles where id = p_coach_id;
    if v_coach_role is null or v_coach_role <> 'coach' then
      raise exception '只能绑定 Coach 角色的账号';
    end if;
  end if;

  update public.profiles set coach_id = p_coach_id, updated_at = now() where id = p_customer_id;
end;
$$;

revoke execute on function public.admin_set_customer_coach(uuid, uuid) from anon;
grant execute on function public.admin_set_customer_coach(uuid, uuid) to authenticated;
