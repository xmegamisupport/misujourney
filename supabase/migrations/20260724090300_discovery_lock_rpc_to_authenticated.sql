-- Lock the discovery RPCs to signed-in users only. They no-op without an
-- authenticated user, but there's no reason for the `anon` role to reach them.
revoke execute on function public.evaluate_discoveries() from public, anon;
revoke execute on function public.get_my_discoveries() from public, anon;
