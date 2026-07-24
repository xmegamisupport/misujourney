-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — Phase 4: internal Discovery Inspector support.
--
-- Lets an admin inspect ANY user's discovery state. The snapshot logic is
-- refactored into one internal helper shared by the self and admin wrappers, and
-- admins get read access to the unlock + queue tables. All conditions still live
-- in the Registry JSON (server-side); this only exposes the per-user data an
-- admin support tool needs.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Internal snapshot: aggregates for one user, no auth check (callers gate) ──
create or replace function public._hidden_discovery_snapshot(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_water_target int;
  v_journey_days int;
  v_base numeric; v_current numeric;
  v_stage int; v_target_max numeric;
  v_current_day int; v_completed boolean;
  v_meal_min_score numeric := 4;  -- provisional; misu_score scale unconfirmed
  j jsonb;
begin
  select coalesce(timezone, 'Asia/Kuala_Lumpur') into v_tz from public.profiles where id = p_user;
  if v_tz is null then return null; end if;

  select water_target_ml, current_stage, stage_goal_weight_max, base_weight_kg
    into v_water_target, v_stage, v_target_max, v_base
    from public.customer_goals where customer_id = p_user order by created_at desc limit 1;
  if v_base is null then select start_weight into v_base from public.profiles where id = p_user; end if;

  select weight into v_current from public.daily_checkins
    where customer_id = p_user and weight is not null order by checkin_date desc, created_at desc limit 1;

  select journey_days into v_journey_days from public.goal_plans where customer_id = p_user order by created_at desc limit 1;
  select max(journey_day) into v_current_day from public.journey_point_events where customer_id = p_user;
  v_completed := v_journey_days is not null and exists (
    select 1 from public.journey_point_events
    where customer_id = p_user and action = 'daily_complete' and journey_day is not null and journey_day >= v_journey_days
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
        ) from public.daily_checkins where customer_id = p_user and weight is not null
      ),
      'water', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct log_date order by log_date), '[]'::jsonb),
          'count', count(distinct log_date))
        from public.daily_water_logs
        where customer_id = p_user and v_water_target is not null and total_ml >= v_water_target
      ),
      'daily_complete', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct earned_on order by earned_on), '[]'::jsonb),
          'count', count(distinct earned_on))
        from public.journey_point_events where customer_id = p_user and action = 'daily_complete'
      ),
      'meal', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct d order by d), '[]'::jsonb), 'count', count(distinct d))
        from (select ((created_at at time zone v_tz) - interval '4 hours')::date d
              from public.meals where customer_id = p_user) s
      ),
      'meal_balanced', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct d order by d), '[]'::jsonb), 'count', count(distinct d))
        from (select ((created_at at time zone v_tz) - interval '4 hours')::date d
              from public.meals where customer_id = p_user and misu_score >= v_meal_min_score) s
      ),
      'reflection', (
        select jsonb_build_object(
          'dates', coalesce(jsonb_agg(distinct checkout_date order by checkout_date), '[]'::jsonb),
          'count', count(distinct checkout_date))
        from public.daily_evening_checkouts where customer_id = p_user
      )
    ),
    'weight', jsonb_build_object('baselineKg', v_base, 'currentKg', v_current),
    'goal', jsonb_build_object('stage', v_stage, 'targetMaxKg', v_target_max),
    'journey', jsonb_build_object('days', v_journey_days, 'currentDay', v_current_day, 'completed', v_completed)
  );
  return j;
end;
$$;
revoke execute on function public._hidden_discovery_snapshot(uuid) from public, anon, authenticated;

-- ── Self wrapper (unchanged contract) ──────────────────────────────────────
create or replace function public.get_hidden_discovery_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.profiles where id = auth.uid() and role = 'customer')
      then public._hidden_discovery_snapshot(auth.uid())
    else null
  end;
$$;
revoke execute on function public.get_hidden_discovery_snapshot() from public, anon;
grant execute on function public.get_hidden_discovery_snapshot() to authenticated;

-- ── Admin wrapper: any user, admin-gated ───────────────────────────────────
create or replace function public.get_hidden_discovery_snapshot_admin(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      then public._hidden_discovery_snapshot(p_user_id)
    else null
  end;
$$;
revoke execute on function public.get_hidden_discovery_snapshot_admin(uuid) from public, anon;
grant execute on function public.get_hidden_discovery_snapshot_admin(uuid) to authenticated;

-- ── Admins may read unlock + queue rows for the Inspector ──────────────────
create policy "discovery unlocks admin read" on public.user_discoveries
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "celebration queue admin read" on public.discovery_celebration_queue
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
