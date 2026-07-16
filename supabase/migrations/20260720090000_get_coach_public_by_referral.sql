-- Referral Registration Flow (Variant B): a minimal, anon-callable lookup so
-- the /register page can identify the Coach behind a ?ref=<code> link BEFORE
-- the customer authenticates, and confirm a manually-typed code.
--
-- Security notes:
--  * SECURITY DEFINER so it can read profiles despite RLS (anon otherwise
--    cannot select a coach row), but it returns ONLY public display fields
--    (name, avatar) and ONLY for role = 'coach'. No private data leaves.
--  * This function NEVER binds anything and NEVER exposes a coach id. The
--    actual, trusted customer→coach binding still happens exclusively inside
--    complete_registration_goals(), which resolves the code string to a
--    role-checked coach_id server-side. The client never submits a coach id.
--  * referral_code is already stored lowercased; matching on lower(trim(...))
--    makes the lookup case- and whitespace-insensitive.
create or replace function public.get_coach_public_by_referral(p_code text)
returns table (name text, avatar text)
language sql
security definer
set search_path = ''
stable
as $$
  select p.name, p.avatar
  from public.profiles p
  where p.role = 'coach'
    and p.referral_code = lower(trim(p_code))
  limit 1;
$$;

revoke all on function public.get_coach_public_by_referral(text) from public;
grant execute on function public.get_coach_public_by_referral(text) to anon, authenticated;
