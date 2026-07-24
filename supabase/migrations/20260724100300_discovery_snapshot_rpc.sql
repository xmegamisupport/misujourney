-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — Phase 3: read-only per-user aggregate snapshot.
--
-- The server-side engine reads trigger CONDITIONS from the Registry JSON (in the
-- app bundle — never shipped to the browser) and evaluates them against this
-- snapshot. The snapshot returns only the caller's OWN data, so it is safe to
-- expose to authenticated users. All dates are the app's journey dates (already
-- written on the 04:00 boundary); meal dates are derived on that same boundary.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.get_hidden_discovery_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  v_tz text;
  v_water_target int;
  v_journey_days int;
  v_base numeric; v_current numeric;
  v_stage int; v_target_max numeric;
  v_current_day int; v_completed boolean;
  -- PROVISIONAL: the misu_score scale is unconfirmed (plate-analysis uses 2–5).
  -- meal_balanced discoveries ship disabled, so this unlocks nothing until a
  -- product decision confirms the threshold. See docs/Hidden-Discovery-Engine.md.
  v_meal_min_score numeric := 4;
  j jsonb;
begin
  if u is null then return null; end if;
  select coalesce(timezone, 'Asia/Kuala_Lumpur') into v_tz from public.profiles where id = u and role = 'customer';
  if v_tz is null then return null; end if;

  select water_target_ml, current_stage, stage_goal_weight_max, base_weight_kg
    into v_water_target, v_stage, v_target_max, v_base
    from public.customer_goals where customer_id = u order by created_at desc limit 1;
  if v_base is null then select start_weight into v_base from public.profiles where id = u; end if;

  select weight into v_current from public.daily_checkins
    where customer_id = u and weight is not null order by checkin_date desc, created_at desc limit 1;

  select journey_days into v_journey_days from public.goal_plans where customer_id = u order by created_at desc limit 1;
  select max(journey_day) into v_current_day from public.journey_point_events where customer_id = u;
  v_completed := v_journey_days is not null and exists (
    select 1 from public.journey_point_events
    where customer_id = u and action = 'daily_complete' and journey_day is not null and journey_day >= v_journey_days
  );

  j := jsonb_build_object(
    'timezone', v_tz,
    'signals', jsonb_build_object(
      'weighin', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct checkin_date order by checkin_date), '[]'::jsonb),
          'count', count(distinct checkin_date),
          'times', coalesce(jsonb_agg(jsonb_build_object(
            'date', checkin_date,
            'localTime', to_char((created_at at time zone v_tz), 'HH24:MI'))), '[]'::jsonb)
        ) from public.daily_checkins where customer_id = u and weight is not null
      ),
      'water', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct log_date order by log_date), '[]'::jsonb),
          'count', count(distinct log_date))
        from public.daily_water_logs
        where customer_id = u and v_water_target is not null and total_ml >= v_water_target
      ),
      'daily_complete', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct earned_on order by earned_on), '[]'::jsonb),
          'count', count(distinct earned_on))
        from public.journey_point_events where customer_id = u and action = 'daily_complete'
      ),
      'meal', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct d order by d), '[]'::jsonb), 'count', count(distinct d))
        from (select ((created_at at time zone v_tz) - interval '4 hours')::date d
              from public.meals where customer_id = u) s
      ),
      'meal_balanced', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct d order by d), '[]'::jsonb), 'count', count(distinct d))
        from (select ((created_at at time zone v_tz) - interval '4 hours')::date d
              from public.meals where customer_id = u and misu_score >= v_meal_min_score) s
      ),
      'reflection', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct checkout_date order by checkout_date), '[]'::jsonb),
          'count', count(distinct checkout_date))
        from public.daily_evening_checkouts where customer_id = u
      )
    ),
    'weight', jsonb_build_object('baselineKg', v_base, 'currentKg', v_current),
    'goal', jsonb_build_object('stage', v_stage, 'targetMaxKg', v_target_max),
    'journey', jsonb_build_object('days', v_journey_days, 'currentDay', v_current_day, 'completed', v_completed)
  );
  return j;
end;
$$;

revoke execute on function public.get_hidden_discovery_snapshot() from public, anon;
grant execute on function public.get_hidden_discovery_snapshot() to authenticated;
