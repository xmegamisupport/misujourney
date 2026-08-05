-- Let a signed-in customer set their own avatar (a Fabibee avatar id like
-- 'cool', or a legacy emoji). SECURITY DEFINER so it only ever writes the
-- caller's own row, regardless of profiles UPDATE RLS.
create or replace function public.set_my_avatar(p_avatar text)
returns void language sql security definer set search_path = ''
as $$
  update public.profiles set avatar = p_avatar where id = auth.uid();
$$;
revoke execute on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;
