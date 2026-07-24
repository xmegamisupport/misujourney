-- ═══════════════════════════════════════════════════════════════════════════
-- Discovery Engine — evaluated on each Glowing You visit. Self-healing like the
-- points engine: assigns clues, unlocks discoveries from real data, evolves
-- hints, rotates a stale clue, and reveals discoveries one at a time (drip).
-- All writes are here (SECURITY DEFINER); the browser can only ask it to run.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.evaluate_discoveries()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
  v_tz text;
  v_water_target int;
  water_dates date[]; weigh_dates date[]; dc_dates date[];
  water_count int; water_streak int; weigh_count int; weigh_streak int;
  dc_count int; dc_streak int; learning_count int; n_used int; dx_used int;
  a record; v_cond jsonb; v_source text; v_val int; v_met boolean;
  v_new_unlock boolean := false;
  v_clue_ct int; v_target int; v_pick uuid;
  v_signals text[]; v_last_progress date; v_stale int;
  v_fav_category text; v_max int; v_drop uuid; v_add uuid;
  v_gap numeric; v_last_reveal timestamptz; v_reveal_id uuid; v_ret jsonb := null;
begin
  if u is null then return null; end if;
  select coalesce(timezone, 'Asia/Kuala_Lumpur') into v_tz from public.profiles where id = u and role = 'customer';
  if v_tz is null then return null; end if;

  insert into public.discovery_engine_logs (user_id) values (u) on conflict do nothing;

  -- ── precompute the aggregates every trigger reads ──────────────────────────
  select water_target_ml into v_water_target from public.customer_goals where customer_id = u order by created_at desc limit 1;
  select array_agg(log_date) into water_dates from public.daily_water_logs where customer_id = u and v_water_target is not null and total_ml >= v_water_target;
  select array_agg(checkin_date) into weigh_dates from public.daily_checkins where customer_id = u and weight is not null;
  select array_agg(distinct earned_on) into dc_dates from public.journey_point_events where customer_id = u and action = 'daily_complete';
  select count(distinct day_number) into learning_count from public.cms_customer_content_progress where customer_id = u and completed_at is not null;
  select coalesce(sum(total_used_units), 0) into n_used from public.customer_inventory where customer_id = u and product_code = 'MISU_N_PLUS';
  select coalesce(sum(total_used_units), 0) into dx_used from public.customer_inventory where customer_id = u and product_code = 'MISU_DX_PLUS';

  water_count := coalesce(array_length(water_dates, 1), 0);
  weigh_count := coalesce(array_length(weigh_dates, 1), 0);
  dc_count := coalesce(array_length(dc_dates, 1), 0);
  water_streak := public.discovery_longest_streak(water_dates);
  weigh_streak := public.discovery_longest_streak(weigh_dates);
  dc_streak := public.discovery_longest_streak(dc_dates);

  -- ── keep the user topped up to the clue target ─────────────────────────────
  v_target := coalesce((select value::int from public.discovery_settings where key = 'clue_target'), 6);
  select count(*) into v_clue_ct from public.user_discovery_clues where user_id = u;
  while v_clue_ct < v_target loop
    select id into v_pick from public.discovery_achievements a2
      where a2.enabled
        and a2.id not in (select achievement_id from public.user_discovery_clues where user_id = u)
        and a2.id not in (select achievement_id from public.user_discoveries where user_id = u)
      order by random() limit 1;
    exit when v_pick is null;
    insert into public.user_discovery_clues (user_id, achievement_id) values (u, v_pick);
    v_clue_ct := v_clue_ct + 1;
  end loop;

  -- ── evaluate unlock triggers (independent of clues) ────────────────────────
  for a in select * from public.discovery_achievements d
           where d.enabled and d.id not in (select achievement_id from public.user_discoveries where user_id = u)
  loop
    v_cond := a.trigger_condition; v_met := false;
    if a.trigger_type in ('cumulative_count', 'first_time', 'habit_level') then
      v_source := coalesce(v_cond->>'source', v_cond->>'habit');
      v_val := case v_source
                 when 'water' then water_count when 'weighin' then weigh_count
                 when 'learning' then learning_count when 'n_plus' then n_used
                 when 'dx_plus' then dx_used when 'daily_complete' then dc_count else 0 end;
      if a.trigger_type = 'first_time' then v_met := v_val >= 1;
      else v_met := v_val >= coalesce((v_cond->>'n')::int, (v_cond->>'threshold')::int, 1); end if;
    elsif a.trigger_type = 'streak_days' then
      v_source := v_cond->>'source';
      v_val := case v_source when 'water' then water_streak when 'weighin' then weigh_streak when 'daily_complete' then dc_streak else 0 end;
      v_met := v_val >= coalesce((v_cond->>'days')::int, 999999);
    elsif a.trigger_type = 'time_of_day' then
      select count(*) into v_val from public.daily_checkins
        where customer_id = u and weight is not null
          and ((created_at at time zone v_tz)::time < (v_cond->>'before')::time);
      v_met := v_val >= coalesce((v_cond->>'count')::int, 1);
    elsif a.trigger_type = 'calendar_date' then
      v_met := exists (select 1 from public.journey_point_events where customer_id = u and to_char(earned_on, 'MM-DD') = v_cond->>'mmdd');
    end if;

    if v_met then
      insert into public.user_discoveries (user_id, achievement_id) values (u, a.id) on conflict do nothing;
      v_new_unlock := true;
    end if;
  end loop;

  -- ── evolve hint stages (per-achievement pacing) ────────────────────────────
  update public.user_discovery_clues c set current_stage = c.current_stage + 1, stage_advanced_at = now()
    from public.discovery_achievements a3
    where c.user_id = u and c.achievement_id = a3.id
      and now() - c.stage_advanced_at >= make_interval(days => a3.hint_advance_days)
      and c.current_stage < coalesce((select max(stage) from public.discovery_hints h where h.achievement_id = a3.id), 1);

  -- ── meaningful-progress date from the enabled signals ──────────────────────
  select array_agg(key) into v_signals from public.discovery_progress_signals where enabled;
  select max(dt) into v_last_progress from (
    select unlocked_at::date dt from public.user_discoveries where user_id = u and 'discovery_unlock' = any(v_signals)
    union all
    select created_at::date from public.journey_point_events where customer_id = u and 'journey_reward' = any(v_signals)
    union all
    select earned_on from public.journey_point_events where customer_id = u and action = 'daily_complete' and 'daily_complete' = any(v_signals)
  ) s;
  update public.discovery_engine_logs set last_progress_date = v_last_progress, updated_at = now() where user_id = u;

  -- ── rotate ONE stale clue toward the user's recent behaviour ───────────────
  v_stale := coalesce((select value::int from public.discovery_settings where key = 'stale_days'), 15);
  if v_last_progress is not null and (current_date - v_last_progress) >= v_stale and not v_new_unlock then
    v_max := greatest(water_count, weigh_count, learning_count, n_used, dx_used, dc_count);
    v_fav_category := case when v_max = 0 then null
      when water_count = v_max then 'water'
      when dc_count = v_max then 'consistency'
      when weigh_count = v_max then 'morning'
      when learning_count = v_max then 'learning'
      when n_used = v_max then 'nutrition'
      when dx_used = v_max then 'detox' else null end;
    select achievement_id into v_drop from public.user_discovery_clues c
      where c.user_id = u and c.achievement_id not in (select achievement_id from public.user_discoveries where user_id = u)
      order by c.current_stage desc, c.assigned_at asc limit 1;
    if v_drop is not null then
      select id into v_add from public.discovery_achievements a4
        where a4.enabled and a4.id <> v_drop
          and a4.id not in (select achievement_id from public.user_discovery_clues where user_id = u)
          and a4.id not in (select achievement_id from public.user_discoveries where user_id = u)
        order by (case when v_fav_category is not null and a4.category = v_fav_category then 0 else 1 end), random() limit 1;
      if v_add is not null then
        delete from public.user_discovery_clues where user_id = u and achievement_id = v_drop;
        insert into public.user_discovery_clues (user_id, achievement_id) values (u, v_add);
        update public.discovery_engine_logs set clue_rotation_date = current_date where user_id = u;
      end if;
    end if;
  end if;

  -- ── reveal ONE discovery at a time, spaced out (drip) ──────────────────────
  v_gap := coalesce((select value::numeric from public.discovery_settings where key = 'reveal_gap_hours'), 6);
  select last_reveal_at into v_last_reveal from public.discovery_engine_logs where user_id = u;
  if v_last_reveal is null or (now() - v_last_reveal) >= make_interval(mins => (v_gap * 60)::int) then
    select ud.achievement_id into v_reveal_id from public.user_discoveries ud
      join public.discovery_achievements a5 on a5.id = ud.achievement_id
      where ud.user_id = u and ud.revealed_at is null
      order by a5.discovery_priority asc, ud.unlocked_at asc limit 1;
    if v_reveal_id is not null then
      update public.user_discoveries set revealed_at = now() where user_id = u and achievement_id = v_reveal_id;
      delete from public.user_discovery_clues where user_id = u and achievement_id = v_reveal_id;
      update public.discovery_engine_logs set last_reveal_at = now() where user_id = u;
      select jsonb_build_object('code', code, 'name', name, 'icon', icon, 'description', description, 'category', category, 'rarity', rarity)
        into v_ret from public.discovery_achievements where id = v_reveal_id;
    end if;
  end if;

  return v_ret;
end;
$$;

grant execute on function public.evaluate_discoveries() to authenticated;

-- ── Read model: current clues (with the right hint) + revealed discoveries ──
create or replace function public.get_my_discoveries()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'clues', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', a.category,
        'rarity', a.rarity,
        'stage', c.current_stage,
        'hint', (select hint_text from public.discovery_hints h
                  where h.achievement_id = a.id and h.stage <= c.current_stage
                  order by h.stage desc limit 1)
      ) order by c.assigned_at)
      from public.user_discovery_clues c
      join public.discovery_achievements a on a.id = c.achievement_id
      where c.user_id = auth.uid()
        and a.id not in (select achievement_id from public.user_discoveries where user_id = auth.uid() and revealed_at is not null)
    ), '[]'::jsonb),
    'discovered', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', a.code, 'name', a.name, 'icon', a.icon,
        'description', a.description, 'category', a.category, 'rarity', a.rarity,
        'unlocked_at', ud.unlocked_at
      ) order by ud.unlocked_at desc)
      from public.user_discoveries ud
      join public.discovery_achievements a on a.id = ud.achievement_id
      where ud.user_id = auth.uid() and ud.revealed_at is not null
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_my_discoveries() to authenticated;
