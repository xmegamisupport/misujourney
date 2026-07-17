-- Coach Capability — Phase 6: RLS hardening (the enforcement layer).
--
-- Routing (/coach), referral resolution, and binding are already capability-
-- gated, but those are UI/logic layers. Customer privacy must ultimately be
-- enforced by the database. This phase adds the capability requirement to
-- EVERY Coach read policy so that revoking Coach capability immediately cuts
-- off database access to all assigned customers' Journey data.
--
-- Principle: a Coach may read a customer's Journey data only when BOTH:
--   (1) the customer is assigned to the caller  (customer.coach_id = auth.uid())
--   (2) the caller currently holds the capability (profiles.is_coach = true)
-- If either is false, access is denied.
--
-- The gate is deliberately is_coach = true ONLY (not "OR role='coach'"):
-- admin_set_coach_access() revokes by setting is_coach=false and intentionally
-- leaves role untouched, so an "OR role='coach'" gate would keep legacy coaches
-- reading customer data forever after revoke. Legacy role='coach' accounts stay
-- compatible because they carry is_coach=true (Phase 1 backfill, re-asserted
-- below) — the capability, not the role tier, is what grants access.
--
-- This ONLY tightens existing policies (adds a conjunct). No coach policy is
-- widened; no other role's policy is touched.

-- ---------- Capability predicate ----------
-- SECURITY DEFINER so it reads the caller's own is_coach flag without being
-- subject to (or recursing through) profiles RLS. STABLE so the planner
-- evaluates it once per statement.
create or replace function public.is_active_coach()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_coach from public.profiles where id = auth.uid()), false);
$$;

revoke execute on function public.is_active_coach() from anon, public;
grant execute on function public.is_active_coach() to authenticated;

-- ---------- Re-assert the Phase 1 backfill ----------
-- Idempotent. Catches any legacy role='coach' row created AFTER the Phase 1
-- migration ran (which the original one-time backfill could not have seen), so
-- an active legacy coach keeps working under the strict is_coach gate below.
-- Does NOT convert role and does NOT grant capability to non-coach accounts.
update public.profiles
   set is_coach = true, coach_activated_at = coalesce(coach_activated_at, now())
 where role = 'coach' and is_coach = false;

-- ---------- Harden every Coach read policy ----------
-- Each ALTER appends "AND public.is_active_coach()" to the existing USING
-- expression; the assignment predicate (coach_id = auth.uid(), directly or via
-- the customer subquery) is preserved exactly.

alter policy profiles_select_as_coach on public.profiles
  using ((coach_id = auth.uid()) and public.is_active_coach());

alter policy checkins_select_as_coach on public.daily_checkins
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy evening_checkouts_select_as_coach on public.daily_evening_checkouts
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy journeys_select_as_coach on public.daily_journeys
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy water_logs_select_as_coach on public.daily_water_logs
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy meals_select_as_coach on public.meals
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy customer_goals_select_as_coach on public.customer_goals
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy goal_plans_select_as_coach on public.goal_plans
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy goal_assessments_select_as_coach on public.goal_assessments
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy journey_nutrition_targets_select_as_coach on public.journey_nutrition_targets
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy inventory_select_as_coach on public.customer_inventory
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy tx_select_as_coach on public.inventory_transactions
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy alerts_select_as_coach on public.repurchase_alerts
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy attention_flags_select_as_coach on public.customer_attention_flags
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy ai_insights_select_as_coach on public.customer_ai_insights
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

alter policy body_progress_records_select_as_coach on public.body_progress_records
  using ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach());

-- body_progress_photos is scoped through its parent record; append the same
-- capability conjunct to the existing nested subquery.
alter policy body_progress_photos_select_as_coach on public.body_progress_photos
  using (
    (record_id in (
      select id from public.body_progress_records
      where customer_id in (select id from public.profiles where coach_id = auth.uid())
    ))
    and public.is_active_coach()
  );

-- ---------- Harden the Coach WRITE branches ----------
-- These policies are shared (customer-self OR coach OR admin). Revoking the
-- capability must also stop a coach from writing to a customer's data, so the
-- capability conjunct is added to the COACH branch only — the customer-self and
-- admin branches are preserved exactly and are NOT weakened.
alter policy ai_insights_insert_own_or_coach on public.customer_ai_insights
  with check (
    (customer_id = auth.uid())
    or ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach())
    or (public."current_role"() = 'admin'::public.user_role)
  );

alter policy attention_flags_insert_own_or_coach on public.customer_attention_flags
  with check (
    (customer_id = auth.uid())
    or ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach())
    or (public."current_role"() = 'admin'::public.user_role)
  );

alter policy attention_flags_update_own_or_coach on public.customer_attention_flags
  using (
    (customer_id = auth.uid())
    or ((customer_id in (select id from public.profiles where coach_id = auth.uid())) and public.is_active_coach())
    or (public."current_role"() = 'admin'::public.user_role)
  );
