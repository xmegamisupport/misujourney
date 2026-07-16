-- Coach Capability — Phase 1: schema + admin RPCs. NO behaviour change.
--
-- Coach is a purely ADDITIVE capability layered on the existing account. This
-- phase only adds the flag/audit columns and the admin-controlled RPCs. It
-- does NOT change routing, navigation, RLS, referral resolution, or any
-- customer/journey data. Activation later touches ONLY is_coach + audit +
-- (confirming) referral_code — never role, coach_id, onboarding, or any
-- customer table.

-- ---------- Columns (additive) ----------
alter table public.profiles
  add column if not exists is_coach boolean not null default false,
  add column if not exists coach_activated_at timestamptz,
  add column if not exists coach_activated_by uuid references public.profiles(id),
  add column if not exists coach_revoked_at timestamptz,
  add column if not exists coach_welcome_ack_at timestamptz;

create index if not exists profiles_is_coach_idx on public.profiles(is_coach) where is_coach;

-- Backward-compat backfill: any legacy role='coach' row keeps working under the
-- new is_coach checks (0 rows today). Does NOT convert role.
update public.profiles
   set is_coach = true, coach_activated_at = coalesce(coach_activated_at, now())
 where role = 'coach' and is_coach = false;

-- ---------- Admin Activate / Revoke ----------
-- Only an Admin may grant or revoke coach access. Enforces the immutable
-- Reseller Username rule (Revision 2): a first activation requires a valid new
-- username; a re-activation confirms the existing one and refuses to change it.
create or replace function public.admin_set_coach_access(
  p_user_id uuid,
  p_enabled boolean,
  p_referral_code text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_code text;
  v_normalized text;
begin
  if public."current_role"() is distinct from 'admin'::public.user_role then
    raise exception '只有管理员可以设置教练权限';
  end if;

  select referral_code into v_existing_code from public.profiles where id = p_user_id;
  if not found then
    raise exception '找不到该用户';
  end if;

  if p_enabled then
    if v_existing_code is not null then
      -- Permanent Reseller Username already set: confirm only, never overwrite.
      if p_referral_code is not null
         and lower(trim(p_referral_code)) is distinct from v_existing_code then
        raise exception '该用户已有 Reseller Username（%），激活时不可更改；如需更改请使用单独的管理员操作', v_existing_code;
      end if;
    else
      -- First activation: a valid Reseller Username is required (not auto-invented).
      if p_referral_code is null or length(trim(p_referral_code)) = 0 then
        raise exception '首次激活教练需要填写有效的 Reseller Username';
      end if;
      v_normalized := lower(trim(p_referral_code));
      if v_normalized !~ '^[a-z0-9]{3,20}$' then
        raise exception 'Reseller Username 只能是 3-20 位英文字母或数字';
      end if;
      if exists (select 1 from public.profiles where referral_code = v_normalized and id <> p_user_id) then
        raise exception '该 Reseller Username 已被使用，请更换';
      end if;
      update public.profiles set referral_code = v_normalized where id = p_user_id;
    end if;

    update public.profiles
       set is_coach = true,
           coach_activated_at = now(),
           coach_activated_by = auth.uid(),
           coach_revoked_at = null
     where id = p_user_id;
  else
    -- Revoke: capability off. referral_code (permanent) and coach_id roster are
    -- intentionally left untouched — reassignment is a separate Admin action.
    update public.profiles
       set is_coach = false,
           coach_revoked_at = now()
     where id = p_user_id;
  end if;
end;
$$;

revoke execute on function public.admin_set_coach_access(uuid, boolean, text) from anon, public;
grant execute on function public.admin_set_coach_access(uuid, boolean, text) to authenticated;

-- ---------- One-time Coach welcome acknowledgement ----------
-- The caller marks their own coach-welcome as seen. Touches only its own row
-- and only that column.
create or replace function public.ack_coach_welcome()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set coach_welcome_ack_at = now()
   where id = auth.uid() and coach_welcome_ack_at is null;
$$;

revoke execute on function public.ack_coach_welcome() from anon, public;
grant execute on function public.ack_coach_welcome() to authenticated;
