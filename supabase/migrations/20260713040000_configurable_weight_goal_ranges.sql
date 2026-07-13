-- ---------- Configurable weight-loss suggestion rules ----------
-- Replaces the fixed 3%/5%-by-BMI-band stage-goal percentage with an
-- admin-configurable range table keyed by (current weight band, journey
-- length): "不要把规则表写死在UI...未来Admin可以修改". Half-open weight bands
-- [min_weight, max_weight) — null means unbounded on that side.
create table public.weight_goal_rules (
  id uuid primary key default gen_random_uuid(),
  min_weight numeric,
  max_weight numeric,
  journey_days integer not null check (journey_days in (30, 60, 90)),
  min_loss_kg numeric not null,
  max_loss_kg numeric not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weight_goal_rules_band_check check (min_weight is null or max_weight is null or min_weight < max_weight),
  constraint weight_goal_rules_loss_check check (min_loss_kg >= 0 and min_loss_kg <= max_loss_kg)
);

create unique index weight_goal_rules_band_days_idx
  on public.weight_goal_rules (coalesce(min_weight, -1), coalesce(max_weight, -1), journey_days)
  where is_active;

alter table public.weight_goal_rules enable row level security;

-- Read-only for any logged-in client (the onboarding wizard needs it for a
-- live preview); writes are reserved for a future Admin console — no
-- INSERT/UPDATE/DELETE grant to anon/authenticated yet.
create policy "weight_goal_rules_select_authenticated" on public.weight_goal_rules for select using (auth.uid() is not null);

revoke truncate, insert, update, delete on public.weight_goal_rules from anon, authenticated;
revoke all on public.weight_goal_rules from anon;

insert into public.weight_goal_rules (min_weight, max_weight, journey_days, min_loss_kg, max_loss_kg) values
  (null, 50, 30, 0.5, 1.5),
  (null, 50, 60, 1, 2.5),
  (null, 50, 90, 2, 4),
  (50, 60, 30, 1, 2),
  (50, 60, 60, 2, 4),
  (50, 60, 90, 3, 6),
  (60, 70, 30, 1.5, 3),
  (60, 70, 60, 3, 5),
  (60, 70, 90, 5, 7),
  (70, 80, 30, 2, 3.5),
  (70, 80, 60, 4, 6),
  (70, 80, 90, 6, 9),
  (80, null, 30, 2.5, 4.5),
  (80, null, 60, 5, 8),
  (80, null, 90, 8, 12);

-- ---------- Store suggestions/goals as ranges, not single points ----------
alter table public.goal_assessments
  add column suggested_stage_goal_min numeric,
  add column suggested_stage_goal_max numeric;
update public.goal_assessments set suggested_stage_goal_min = suggested_stage_goal, suggested_stage_goal_max = suggested_stage_goal;
alter table public.goal_assessments
  alter column suggested_stage_goal_min set not null,
  alter column suggested_stage_goal_max set not null,
  drop column suggested_stage_goal;

alter table public.customer_goals
  add column stage_goal_weight_min numeric,
  add column stage_goal_weight_max numeric,
  add column is_custom_goal boolean not null default false,
  add column base_weight_kg numeric;
update public.customer_goals set stage_goal_weight_min = stage_goal_weight, stage_goal_weight_max = stage_goal_weight, base_weight_kg = stage_goal_weight;
alter table public.customer_goals
  alter column stage_goal_weight_min set not null,
  alter column stage_goal_weight_max set not null,
  alter column base_weight_kg set not null,
  drop column stage_goal_weight;

-- ---------- Rewrite the goal RPC around ranges + optional custom goal ----------
-- Signature gains two trailing params, so this is a new overload as far as
-- Postgres is concerned — drop the old one explicitly instead of relying on
-- create-or-replace (which would only work for an unchanged signature).
drop function public.complete_registration_goals(uuid, text, numeric, numeric, integer, text, text, public.diet_type, public.activity_level, public.goal_type, integer, numeric, text);

create function public.complete_registration_goals(
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
  p_referral_code text default null,
  p_use_custom_goal boolean default false,
  p_custom_loss_kg numeric default null
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_height_m numeric;
  v_bmi numeric;
  v_bmi_category public.bmi_category;
  v_goal_status public.goal_status;
  v_can_lose boolean;
  v_rule_min_loss numeric;
  v_rule_max_loss numeric;
  v_suggested_min numeric;
  v_suggested_max numeric;
  v_final_min numeric;
  v_final_max numeric;
  v_is_custom boolean := false;
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

  v_can_lose := v_goal_status <> 'goal_restricted' and v_bmi >= 18.5 and p_goal_type = 'lose_weight';

  if v_can_lose then
    select min_loss_kg, max_loss_kg into v_rule_min_loss, v_rule_max_loss
    from public.weight_goal_rules
    where is_active
      and journey_days = p_journey_days
      and (min_weight is null or p_current_weight >= min_weight)
      and (max_weight is null or p_current_weight < max_weight)
    limit 1;

    if v_rule_min_loss is null then
      -- No configured band covers this weight (e.g. rules were edited and a
      -- gap opened up) — fail safe to maintenance rather than guessing.
      v_can_lose := false;
      v_suggested_min := p_current_weight;
      v_suggested_max := p_current_weight;
    else
      -- More loss => lower weight, so max loss maps to the low end of the
      -- target-weight range and vice versa.
      v_suggested_min := round(p_current_weight - v_rule_max_loss, 1);
      v_suggested_max := round(p_current_weight - v_rule_min_loss, 1);
    end if;
  else
    v_suggested_min := p_current_weight;
    v_suggested_max := p_current_weight;
  end if;

  if v_can_lose and p_use_custom_goal then
    if p_custom_loss_kg is null or p_custom_loss_kg <= 0 or p_custom_loss_kg >= p_current_weight then
      raise exception '自订减重公斤数无效';
    end if;
    -- Customer may pick a target outside the suggested range — the UI warns
    -- but does not block it ("系统不要禁止").
    v_final_min := round(p_current_weight - p_custom_loss_kg, 1);
    v_final_max := v_final_min;
    v_is_custom := true;
  else
    v_final_min := v_suggested_min;
    v_final_max := v_suggested_max;
    v_is_custom := false;
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

  insert into public.goal_assessments (customer_id, bmi, bmi_category, suggested_stage_goal_min, suggested_stage_goal_max, long_term_goal, goal_status)
    values (p_customer_id, v_bmi, v_bmi_category, v_suggested_min, v_suggested_max, p_long_term_goal_weight, v_goal_status);

  insert into public.customer_goals (customer_id, current_stage, stage_goal_weight_min, stage_goal_weight_max, is_custom_goal, base_weight_kg, long_term_goal_weight, goal_status)
    values (p_customer_id, 1, v_final_min, v_final_max, v_is_custom, p_current_weight, p_long_term_goal_weight, v_goal_status);

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
    'stageGoalWeightMin', v_final_min,
    'stageGoalWeightMax', v_final_max,
    'isCustomGoal', v_is_custom,
    'suggestedMin', v_suggested_min,
    'suggestedMax', v_suggested_max,
    'journeyDays', p_journey_days,
    'targetCheckInDays', v_check_in_days,
    'target211Meals', v_211_meals,
    'targetWaterDays', v_water_days,
    'targetMisuDays', v_misu_days,
    'coachMatched', v_coach_id is not null
  );
end;
$$;

revoke execute on function public.complete_registration_goals(uuid, text, numeric, numeric, integer, text, text, public.diet_type, public.activity_level, public.goal_type, integer, numeric, text, boolean, numeric) from public;
revoke execute on function public.complete_registration_goals(uuid, text, numeric, numeric, integer, text, text, public.diet_type, public.activity_level, public.goal_type, integer, numeric, text, boolean, numeric) from anon, authenticated;
grant execute on function public.complete_registration_goals(uuid, text, numeric, numeric, integer, text, text, public.diet_type, public.activity_level, public.goal_type, integer, numeric, text, boolean, numeric) to authenticated;
