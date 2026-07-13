-- ---------- Security hardening found while extending profiles ----------
-- TRUNCATE is not governed by Row Level Security (RLS only applies to
-- SELECT/INSERT/UPDATE/DELETE) — Supabase's default broad TRUNCATE grant to
-- anon/authenticated on new tables means any authenticated (or even
-- unauthenticated) client could wipe any table via a raw REST call,
-- regardless of RLS policies. Revoke it everywhere. The SELECT/INSERT/
-- UPDATE/DELETE grants intentionally stay broad per Supabase convention,
-- since RLS is the real enforcement layer for those operations.
revoke truncate on public.profiles, public.customer_inventory, public.inventory_transactions, public.repurchase_alerts, public.daily_checkins, public.meals from anon, authenticated;

-- profiles_update_own had no WITH CHECK, so its implicit check only re-tested
-- `id = auth.uid()` against the *new* row — which never blocks anything,
-- since a customer updating their own row always keeps the same id. Combined
-- with the default broad UPDATE grant, any authenticated customer could set
-- their own role to 'admin' or reassign their own coach_id via a raw PATCH.
drop policy "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- All profile fields touched by onboarding are now written exclusively via
-- the complete_registration_goals() SECURITY DEFINER RPC below (same
-- writes-go-through-RPCs pattern as the inventory system), so no direct
-- client UPDATE grant is needed on profiles at all.
revoke update on public.profiles from anon, authenticated;

-- ---------- Extend profiles for real customer onboarding ----------
create type public.diet_type as enum ('regular', 'vegetarian', 'ovo_lacto_vegetarian', 'vegan', 'other');
create type public.activity_level as enum ('sedentary', 'light', 'moderate', 'high');
create type public.goal_type as enum ('improve_diet', 'lose_weight', 'improve_routine', 'maintain_weight');
create type public.goal_status as enum ('auto_approved', 'auto_adjusted', 'goal_restricted');
create type public.bmi_category as enum ('underweight', 'normal', 'overweight', 'obese');

alter table public.profiles
  add column height numeric,
  add column age integer,
  add column gender text check (gender in ('female', 'male')),
  add column phone text,
  add column diet_type public.diet_type,
  add column activity_level public.activity_level,
  add column start_weight numeric,
  add column start_date date,
  add column referral_code text unique,
  add column onboarding_completed_at timestamptz;

-- ---------- Goal-planning tables ----------
-- Append-only by design (same pattern as inventory_transactions): each row
-- is one assessment/goal/plan snapshot, "current" = latest by created_at.
-- This leaves room for a future stage-2+ recalculation flow without needing
-- an update-in-place migration later.

create table public.goal_assessments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  bmi numeric not null,
  bmi_category public.bmi_category not null,
  suggested_stage_goal numeric not null,
  long_term_goal numeric,
  goal_status public.goal_status not null,
  created_at timestamptz not null default now()
);

create table public.customer_goals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  current_stage integer not null default 1,
  stage_goal_weight numeric not null,
  long_term_goal_weight numeric,
  goal_status public.goal_status not null,
  created_at timestamptz not null default now()
);

create table public.goal_plans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  journey_days integer not null check (journey_days in (30, 60, 90)),
  target_check_in_days integer not null,
  target_211_meals integer not null,
  target_water_days integer not null,
  target_misu_days integer not null,
  created_at timestamptz not null default now()
);

create index goal_assessments_customer_idx on public.goal_assessments (customer_id, created_at desc);
create index customer_goals_customer_idx on public.customer_goals (customer_id, created_at desc);
create index goal_plans_customer_idx on public.goal_plans (customer_id, created_at desc);

alter table public.goal_assessments enable row level security;
alter table public.customer_goals enable row level security;
alter table public.goal_plans enable row level security;

-- Read-only for clients; all writes go through complete_registration_goals().
create policy "goal_assessments_select_own" on public.goal_assessments for select using (customer_id = auth.uid());
create policy "goal_assessments_select_as_coach" on public.goal_assessments for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "goal_assessments_select_as_admin" on public.goal_assessments for select using (public.current_role() = 'admin');

create policy "customer_goals_select_own" on public.customer_goals for select using (customer_id = auth.uid());
create policy "customer_goals_select_as_coach" on public.customer_goals for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "customer_goals_select_as_admin" on public.customer_goals for select using (public.current_role() = 'admin');

create policy "goal_plans_select_own" on public.goal_plans for select using (customer_id = auth.uid());
create policy "goal_plans_select_as_coach" on public.goal_plans for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "goal_plans_select_as_admin" on public.goal_plans for select using (public.current_role() = 'admin');

revoke truncate, insert, update, delete on public.goal_assessments, public.customer_goals, public.goal_plans from anon, authenticated;

-- ---------- Fixed-rule goal calculation RPC (no AI) ----------
-- Implements calculateBMI / getBMICategory / calculateStageGoal /
-- validateLongTermGoal / buildJourneyPlan / evaluateGoalStatus as one
-- deterministic, atomic transaction, mirroring the record_meal /
-- init_customer_inventory pattern used by the inventory system.
create or replace function public.complete_registration_goals(
  p_customer_id uuid,
  p_name text,
  p_height numeric,
  p_current_weight numeric,
  p_age integer,
  p_gender text,
  p_phone text,
  p_diet_type public.diet_type,
  p_activity_level public.activity_level,
  p_goal_type public.goal_type,
  p_journey_days integer,
  p_long_term_goal_weight numeric default null,
  p_referral_code text default null
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_height_m numeric;
  v_bmi numeric;
  v_bmi_category public.bmi_category;
  v_goal_status public.goal_status;
  v_stage_goal numeric;
  v_check_in_days integer;
  v_211_meals integer;
  v_water_days integer;
  v_misu_days integer;
  v_coach_id uuid;
  v_abnormal boolean;
begin
  if auth.uid() is distinct from p_customer_id then
    raise exception '只能设置自己的目标';
  end if;
  if p_journey_days not in (30, 60, 90) then
    raise exception 'Journey 计划只能是 30 / 60 / 90 天';
  end if;

  -- "身高体重异常 / 输入明显错误" -> goal_restricted, not a hard error, so
  -- the customer can still start their Journey on the habit-only track.
  v_abnormal := p_height < 100 or p_height > 250 or p_current_weight < 20 or p_current_weight > 300 or p_age < 13 or p_age > 100;

  v_height_m := p_height / 100.0;
  v_bmi := round(p_current_weight / (v_height_m * v_height_m), 1);
  v_bmi_category := case
    when v_bmi < 18.5 then 'underweight'
    when v_bmi < 25 then 'normal'
    when v_bmi < 30 then 'overweight'
    else 'obese'
  end;

  if v_abnormal then
    v_goal_status := 'goal_restricted';
  elsif v_bmi < 18.5 and p_goal_type = 'lose_weight' then
    v_goal_status := 'goal_restricted';
  elsif p_long_term_goal_weight is not null and (p_long_term_goal_weight / (v_height_m * v_height_m)) < 18.5 then
    v_goal_status := 'goal_restricted';
  elsif p_long_term_goal_weight is not null and p_goal_type = 'lose_weight' then
    v_goal_status := 'auto_adjusted';
  else
    v_goal_status := 'auto_approved';
  end if;

  -- Stage-1 goal: maintenance unless the customer both can and wants to lose
  -- weight. Fixed percentages, never a variable/AI-derived number.
  if v_goal_status = 'goal_restricted' or v_bmi < 18.5 or p_goal_type <> 'lose_weight' then
    v_stage_goal := p_current_weight;
  elsif v_bmi < 25 then
    v_stage_goal := round(p_current_weight * 0.97, 1); -- ~3%
  else
    v_stage_goal := round(p_current_weight * 0.95, 1); -- ~5% (within the 3~5% band)
  end if;

  -- Journey plan targets: fixed ratios calibrated to the 30-day reference
  -- example (25 check-in days / 18 211-plate meals / 20 water days / 25
  -- MISU days out of 30), scaled proportionally for 60/90-day plans.
  v_check_in_days := round(p_journey_days * 25.0 / 30);
  v_211_meals := round(p_journey_days * 18.0 / 30);
  v_water_days := round(p_journey_days * 20.0 / 30);
  v_misu_days := round(p_journey_days * 25.0 / 30);

  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select id into v_coach_id from public.profiles where referral_code = trim(p_referral_code) and role = 'coach';
  end if;

  insert into public.goal_assessments (customer_id, bmi, bmi_category, suggested_stage_goal, long_term_goal, goal_status)
    values (p_customer_id, v_bmi, v_bmi_category, v_stage_goal, p_long_term_goal_weight, v_goal_status);

  insert into public.customer_goals (customer_id, current_stage, stage_goal_weight, long_term_goal_weight, goal_status)
    values (p_customer_id, 1, v_stage_goal, p_long_term_goal_weight, v_goal_status);

  insert into public.goal_plans (customer_id, journey_days, target_check_in_days, target_211_meals, target_water_days, target_misu_days)
    values (p_customer_id, p_journey_days, v_check_in_days, v_211_meals, v_water_days, v_misu_days);

  update public.profiles set
    name = coalesce(nullif(trim(p_name), ''), name),
    height = p_height,
    age = p_age,
    gender = p_gender,
    phone = p_phone,
    diet_type = p_diet_type,
    activity_level = p_activity_level,
    start_weight = p_current_weight,
    start_date = current_date,
    onboarding_completed_at = now(),
    coach_id = coalesce(v_coach_id, coach_id),
    updated_at = now()
  where id = p_customer_id;

  return jsonb_build_object(
    'bmi', v_bmi,
    'bmiCategory', v_bmi_category,
    'goalStatus', v_goal_status,
    'stageGoalWeight', v_stage_goal,
    'journeyDays', p_journey_days,
    'targetCheckInDays', v_check_in_days,
    'target211Meals', v_211_meals,
    'targetWaterDays', v_water_days,
    'targetMisuDays', v_misu_days,
    'coachMatched', v_coach_id is not null
  );
end;
$$;

revoke execute on function public.complete_registration_goals(uuid, text, numeric, numeric, integer, text, text, public.diet_type, public.activity_level, public.goal_type, integer, numeric, text) from anon, authenticated;
grant execute on function public.complete_registration_goals(uuid, text, numeric, numeric, integer, text, text, public.diet_type, public.activity_level, public.goal_type, integer, numeric, text) to authenticated;
