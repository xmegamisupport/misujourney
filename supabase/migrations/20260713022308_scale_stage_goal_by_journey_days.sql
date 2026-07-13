-- calculateStageGoal() previously ignored journey_days entirely, so a 30/60/
-- 90-day plan all produced the identical stage-1 target. Scale the reduction
-- rate by plan length (still a fixed lookup table, not linear scaling, so a
-- 90-day plan never suggests losing too much at once).
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
  v_reduction_rate numeric;
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
  -- weight. Fixed percentages per (BMI band, Journey length) — longer plans
  -- allow a larger stage-1 target, capped well short of linear scaling.
  if v_goal_status = 'goal_restricted' or v_bmi < 18.5 or p_goal_type <> 'lose_weight' then
    v_stage_goal := p_current_weight;
  else
    if v_bmi < 25 then
      v_reduction_rate := case p_journey_days when 30 then 0.03 when 60 then 0.05 else 0.07 end;
    else
      v_reduction_rate := case p_journey_days when 30 then 0.05 when 60 then 0.08 else 0.12 end;
    end if;
    v_stage_goal := round(p_current_weight * (1 - v_reduction_rate), 1);
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

-- create or replace function preserves existing grants, so no re-grant needed.
