-- ---------- Journey Nutrition Targets ----------
-- Replaces hardcoded 1500kcal/90g-protein/etc dashboard constants with a
-- per-customer target computed once per Journey and held fixed for its
-- whole duration (never recalculated off day-to-day weight fluctuation).
create table public.journey_nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  journey_id uuid not null references public.customer_goals (id) on delete cascade,
  journey_start_weight_kg numeric not null,
  bmr numeric not null,
  tdee numeric not null,
  activity_level public.activity_level not null,
  daily_calories integer not null,
  daily_protein integer not null,
  daily_carbohydrate integer not null,
  daily_fat integer not null,
  daily_fiber integer not null,
  calculation_method text not null default 'mifflin_st_jeor_v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index journey_nutrition_targets_journey_idx on public.journey_nutrition_targets (journey_id);
create index journey_nutrition_targets_customer_idx on public.journey_nutrition_targets (customer_id, created_at desc);

alter table public.journey_nutrition_targets enable row level security;

-- Read-only for clients; all writes go through generate_journey_nutrition_target(),
-- called internally by complete_registration_goals() — same
-- writes-go-through-RPCs pattern as goal_assessments/customer_goals/goal_plans.
create policy "journey_nutrition_targets_select_own" on public.journey_nutrition_targets for select using (customer_id = auth.uid());
create policy "journey_nutrition_targets_select_as_coach" on public.journey_nutrition_targets for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "journey_nutrition_targets_select_as_admin" on public.journey_nutrition_targets for select using (public.current_role() = 'admin');

revoke truncate, insert, update, delete on public.journey_nutrition_targets from anon, authenticated;
revoke all on public.journey_nutrition_targets from anon;

-- ---------- NutritionEngine ----------
-- Every nutrition-target formula lives in this one section, nowhere else.
-- generate_journey_nutrition_target() is the single entry point that writes;
-- it is invoked once per Journey start (currently: from within
-- complete_registration_goals()) and the stored row is fixed for the whole
-- Journey.

-- Mifflin-St Jeor BMR.
create or replace function public.calculate_bmr(p_gender text, p_age integer, p_height_cm numeric, p_weight_kg numeric)
returns numeric
language sql immutable
set search_path = ''
as $$
  select case p_gender
    when 'male' then 10 * p_weight_kg + 6.25 * p_height_cm - 5 * p_age + 5
    else 10 * p_weight_kg + 6.25 * p_height_cm - 5 * p_age - 161
  end;
$$;

-- Activity multiplier: sedentary 1.20 / light 1.375 / moderate 1.55 / high 1.725.
create or replace function public.calculate_tdee(p_bmr numeric, p_activity_level public.activity_level)
returns numeric
language sql immutable
set search_path = ''
as $$
  select p_bmr * case p_activity_level
    when 'sedentary' then 1.20
    when 'light' then 1.375
    when 'moderate' then 1.55
    when 'high' then 1.725
  end;
$$;

-- TDEE x 0.85 (~15% deficit), floored at 1200 kcal (female) / 1500 kcal (male)
-- for safety instead of a fixed -500kcal deficit.
create or replace function public.calculate_daily_calories(p_tdee numeric, p_gender text)
returns integer
language sql immutable
set search_path = ''
as $$
  select greatest(
    round(p_tdee * 0.85)::integer,
    case p_gender when 'male' then 1500 else 1200 end
  );
$$;

-- Journey Start Weight x 1.5g/kg, fixed for the Journey.
create or replace function public.calculate_daily_protein(p_journey_start_weight_kg numeric)
returns integer
language sql immutable
set search_path = ''
as $$
  select round(p_journey_start_weight_kg * 1.5)::integer;
$$;

-- 25% of daily calories, converted to grams (9 kcal/g).
create or replace function public.calculate_daily_fat(p_daily_calories integer)
returns integer
language sql immutable
set search_path = ''
as $$
  select round(p_daily_calories * 0.25 / 9.0)::integer;
$$;

-- Remaining calories after protein + fat, converted to grams (4 kcal/g).
create or replace function public.calculate_daily_carbohydrate(p_daily_calories integer, p_daily_protein integer, p_daily_fat integer)
returns integer
language sql immutable
set search_path = ''
as $$
  select greatest(0, round((p_daily_calories - p_daily_protein * 4 - p_daily_fat * 9) / 4.0)::integer);
$$;

-- 14g per 1000kcal, clamped to [25, 35]g.
create or replace function public.calculate_daily_fiber(p_daily_calories integer)
returns integer
language sql immutable
set search_path = ''
as $$
  select least(35, greatest(25, round(p_daily_calories / 1000.0 * 14)::integer));
$$;

create or replace function public.generate_journey_nutrition_target(
  p_customer_id uuid,
  p_journey_id uuid,
  p_gender text,
  p_age integer,
  p_height_cm numeric,
  p_journey_start_weight_kg numeric,
  p_activity_level public.activity_level
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_bmr numeric;
  v_tdee numeric;
  v_calories integer;
  v_protein integer;
  v_fat integer;
  v_carbs integer;
  v_fiber integer;
  v_id uuid;
begin
  v_bmr := public.calculate_bmr(p_gender, p_age, p_height_cm, p_journey_start_weight_kg);
  v_tdee := public.calculate_tdee(v_bmr, p_activity_level);
  v_calories := public.calculate_daily_calories(v_tdee, p_gender);
  v_protein := public.calculate_daily_protein(p_journey_start_weight_kg);
  v_fat := public.calculate_daily_fat(v_calories);
  v_carbs := public.calculate_daily_carbohydrate(v_calories, v_protein, v_fat);
  v_fiber := public.calculate_daily_fiber(v_calories);

  insert into public.journey_nutrition_targets (
    customer_id, journey_id, journey_start_weight_kg, bmr, tdee, activity_level,
    daily_calories, daily_protein, daily_carbohydrate, daily_fat, daily_fiber
  ) values (
    p_customer_id, p_journey_id, p_journey_start_weight_kg, round(v_bmr), round(v_tdee), p_activity_level,
    v_calories, v_protein, v_carbs, v_fat, v_fiber
  )
  on conflict (journey_id) do update set
    journey_start_weight_kg = excluded.journey_start_weight_kg,
    bmr = excluded.bmr,
    tdee = excluded.tdee,
    activity_level = excluded.activity_level,
    daily_calories = excluded.daily_calories,
    daily_protein = excluded.daily_protein,
    daily_carbohydrate = excluded.daily_carbohydrate,
    daily_fat = excluded.daily_fat,
    daily_fiber = excluded.daily_fiber,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.calculate_bmr(text, integer, numeric, numeric) from anon, authenticated;
revoke execute on function public.calculate_tdee(numeric, public.activity_level) from anon, authenticated;
revoke execute on function public.calculate_daily_calories(numeric, text) from anon, authenticated;
revoke execute on function public.calculate_daily_protein(numeric) from anon, authenticated;
revoke execute on function public.calculate_daily_fat(integer) from anon, authenticated;
revoke execute on function public.calculate_daily_carbohydrate(integer, integer, integer) from anon, authenticated;
revoke execute on function public.calculate_daily_fiber(integer) from anon, authenticated;
revoke execute on function public.generate_journey_nutrition_target(uuid, uuid, text, integer, numeric, numeric, public.activity_level) from anon, authenticated;

-- ---------- Wire into the single Journey-start entry point ----------
-- Same signature as the 20260713040000 version — create-or-replace in place,
-- no new overload. Captures the new customer_goals.id via RETURNING so the
-- nutrition target row can reference it as journey_id.
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
  v_goal_id uuid;
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
    values (p_customer_id, 1, v_final_min, v_final_max, v_is_custom, p_current_weight, p_long_term_goal_weight, v_goal_status)
    returning id into v_goal_id;

  insert into public.goal_plans (customer_id, journey_days, target_check_in_days, target_211_meals, target_water_days, target_misu_days)
    values (p_customer_id, p_journey_days, v_check_in_days, v_211_meals, v_water_days, v_misu_days);

  perform public.generate_journey_nutrition_target(p_customer_id, v_goal_id, p_gender, p_age, p_height, p_current_weight, p_activity_level);

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

-- ---------- Backfill for customers who registered before this migration ----------
do $$
declare
  r record;
begin
  for r in
    select cg.id as journey_id, cg.customer_id, p.gender, p.age, p.height, cg.base_weight_kg, p.activity_level
    from public.customer_goals cg
    join public.profiles p on p.id = cg.customer_id
    where p.gender is not null and p.age is not null and p.height is not null and p.activity_level is not null
      and not exists (select 1 from public.journey_nutrition_targets jnt where jnt.journey_id = cg.id)
  loop
    perform public.generate_journey_nutrition_target(r.customer_id, r.journey_id, r.gender, r.age, r.height, r.base_weight_kg, r.activity_level);
  end loop;
end;
$$;
