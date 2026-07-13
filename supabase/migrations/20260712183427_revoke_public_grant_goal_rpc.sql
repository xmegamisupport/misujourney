-- CREATE FUNCTION grants EXECUTE to the PUBLIC pseudo-role by default (plain
-- Postgres behavior, separate from Supabase's per-role anon/authenticated
-- default privileges already handled in the previous migration). Revoking
-- from anon/authenticated by name doesn't touch a PUBLIC grant, so
-- complete_registration_goals was still anon-callable via PUBLIC.
revoke execute on function public.complete_registration_goals(uuid, text, numeric, numeric, integer, text, text, public.diet_type, public.activity_level, public.goal_type, integer, numeric, text) from public;
