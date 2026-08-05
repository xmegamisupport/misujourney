-- Avatar is a one-time choice: chosen during onboarding (or once from profile
-- for users who never got to), then locked. A future Hidden-Discovery unlock
-- flips avatar_locked back to false to allow another change.
alter table public.profiles add column if not exists avatar_locked boolean not null default false;

drop function if exists public.set_my_avatar(text);
create function public.set_my_avatar(p_avatar text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_locked boolean;
begin
  select avatar_locked into v_locked from public.profiles where id = auth.uid();
  if v_locked is distinct from false then
    return false; -- already locked (or no profile) — no change
  end if;
  update public.profiles set avatar = p_avatar, avatar_locked = true where id = auth.uid();
  return true;
end;
$$;
revoke execute on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;
