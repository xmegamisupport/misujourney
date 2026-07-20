-- Weighing in is now open for the whole Journey Day. Earlier simply earns more.
--
-- The 04:00-12:00 "window" was never actually enforced: neither the check-in
-- page nor record_morning_checkin ever looked at the clock. The Dashboard just
-- hid the entry point, so any other route in — the back button on 晨重历史, for
-- one — walked straight past it. Opening it up removes a UI blind; it does not
-- grant a capability that was not already there.
--
-- Rewarding the morning rather than forbidding the afternoon keeps the real
-- reason for the rule (weight is most consistent right after waking) while
-- dropping the part that only punished a late riser with nothing at all.
--
-- Two actions rather than one computed amount, so every value stays a row in
-- journey_point_values and re-tuning stays a single UPDATE.
insert into public.journey_point_values (action, points, label, emoji) values
  ('weighin_early', 20, '完成今日晨重', '⚖️'),
  ('weighin_mid',   10, '完成今日晨重', '⚖️')
on conflict (action) do nothing;

-- The original weighin row is deliberately KEPT even though nothing awards it
-- any more: journey_point_events.action references it, and points already
-- earned must not be rewritten by a rule that did not exist at the time.
comment on table public.journey_point_values is
  'Tunable point values. Rows are never deleted — journey_point_events references them, so a retired action stays for the history that already used it.';

create or replace function public.refresh_journey_rewards()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer uuid := auth.uid();
  v_tz text;
  v_date date;
  v_day integer;
  v_awarded jsonb := '[]'::jsonb;
  v_one jsonb;

  v_has_weighin boolean;
  v_weighin_hour integer;
  v_weighin_action text;
  v_has_meal boolean;
  v_has_water boolean;
  v_has_learning boolean;
  v_has_reflection boolean;

  v_water_target integer;
  v_water_ml integer;
  v_scheduled integer;
  v_completed integer;

  v_win record;
  v_days_done integer;

  v_rec record;
  v_last_body date;
  v_stage integer;
  v_stage_max numeric;
  v_latest_weight numeric;
begin
  if v_customer is null then
    raise exception '请先登录';
  end if;

  select coalesce(timezone, 'Asia/Kuala_Lumpur') into v_tz
    from public.profiles where id = v_customer and role = 'customer';
  if v_tz is null then
    return '[]'::jsonb;  -- not a customer: nothing to award, and nothing to leak
  end if;

  v_date := public.customer_journey_date(v_customer);
  v_day  := public.customer_current_journey_day(v_customer);

  -- ── Daily ────────────────────────────────────────────────────────────────
  -- The hour she actually recorded it, in her own timezone. created_at is when
  -- she pressed submit, which is the only honest signal we have of when she
  -- stood on the scale.
  select true, extract(hour from (c.created_at at time zone v_tz))::integer
    into v_has_weighin, v_weighin_hour
    from public.daily_checkins c
   where c.customer_id = v_customer and c.checkin_date = v_date and c.weight is not null
   limit 1;
  v_has_weighin := coalesce(v_has_weighin, false);

  -- Past noon earns nothing — but v_has_weighin stays true, so the task still
  -- counts toward 5/5 and toward the 完成今天的 Journey bonus. Points earned and
  -- task completed are deliberately different questions.
  v_weighin_action := case
    when not v_has_weighin then null
    when v_weighin_hour < 10 then 'weighin_early'
    when v_weighin_hour < 12 then 'weighin_mid'
    else null
  end;

  -- A meal only counts if the AI actually recognised something in it. A photo
  -- of a chair returns two empty arrays, so this one condition is the whole
  -- "don't reward random photos" defence — and it is evaluated server-side,
  -- from what was stored, not from anything the client claims.
  -- The 4-hour shift matches customer_journey_date(), so "today" here is the
  -- same "today" the Dashboard shows. If these two ever disagree, a customer
  -- sees 5/5 complete and no bonus, which reads as a broken promise.
  select exists (
    select 1 from public.meals m
     where m.customer_id = v_customer
       and (((m.created_at at time zone v_tz) - interval '4 hours')::date) = v_date
       and (
         (case when jsonb_typeof(m.misu_items) = 'array' then jsonb_array_length(m.misu_items) else 0 end)
       + (case when jsonb_typeof(m.food_items) = 'array' then jsonb_array_length(m.food_items) else 0 end)
       ) > 0
  ) into v_has_meal;

  select water_target_ml into v_water_target
    from public.customer_goals where customer_id = v_customer
    order by created_at desc limit 1;
  select total_ml into v_water_ml
    from public.daily_water_logs where customer_id = v_customer and log_date = v_date;
  v_has_water := v_water_target is not null and coalesce(v_water_ml, 0) >= v_water_target;

  -- A day with nothing scheduled counts as done, exactly as the Dashboard
  -- treats it — otherwise 5/5 would be unreachable on those days.
  select count(*) into v_scheduled from public.cms_journey_schedule where day_number = v_day;
  select count(*) into v_completed
    from public.cms_customer_content_progress
    where customer_id = v_customer and day_number = v_day and completed_at is not null;
  v_has_learning := v_scheduled = 0 or v_completed >= v_scheduled;

  select exists (
    select 1 from public.daily_evening_checkouts
     where customer_id = v_customer and checkout_date = v_date
  ) into v_has_reflection;

  -- One event_key whatever the tier, so a weigh-in can never be paid twice and
  -- an earlier day is never re-rated.
  if v_weighin_action is not null then
    v_one := public.award_journey_points(v_customer, v_weighin_action, 'weighin:' || v_date, v_day, v_date);
    if v_one is not null then v_awarded := v_awarded || v_one; end if;
  end if;
  if v_has_learning and v_scheduled > 0 then
    v_one := public.award_journey_points(v_customer, 'learning', 'learning:' || v_date, v_day, v_date);
    if v_one is not null then v_awarded := v_awarded || v_one; end if;
  end if;
  if v_has_water then
    v_one := public.award_journey_points(v_customer, 'water', 'water:' || v_date, v_day, v_date);
    if v_one is not null then v_awarded := v_awarded || v_one; end if;
  end if;
  if v_has_meal then
    v_one := public.award_journey_points(v_customer, 'meal', 'meal:' || v_date, v_day, v_date);
    if v_one is not null then v_awarded := v_awarded || v_one; end if;
  end if;
  if v_has_reflection then
    v_one := public.award_journey_points(v_customer, 'reflection', 'reflection:' || v_date, v_day, v_date);
    if v_one is not null then v_awarded := v_awarded || v_one; end if;
  end if;

  if v_has_weighin and v_has_meal and v_has_water and v_has_learning and v_has_reflection then
    v_one := public.award_journey_points(v_customer, 'daily_complete', 'daily_complete:' || v_date, v_day, v_date);
    if v_one is not null then v_awarded := v_awarded || v_one; end if;
  end if;

  -- ── Consistency ──────────────────────────────────────────────────────────
  -- A WINDOW, not a chain: "5 of the last 7 days", not "7 in a row". It can
  -- never reset to zero, so one sick day costs one day. Each tier is paid once
  -- per customer (event_key = action), which is why a lapse then a recovery
  -- does not re-pay it.
  -- The ledger is its own source of truth here: a day "counts" iff it earned
  -- the daily_complete award.
  for v_win in
    select * from (values (7, 5, 'consistency_7'), (14, 10, 'consistency_14'),
                          (30, 21, 'consistency_30'), (60, 42, 'consistency_60'))
      as t(window_days, needed, bonus_action)
  loop
    select count(distinct earned_on) into v_days_done
      from public.journey_point_events
     where customer_id = v_customer
       and action = 'daily_complete'
       and earned_on > v_date - v_win.window_days
       and earned_on <= v_date;

    if v_days_done >= v_win.needed then
      v_one := public.award_journey_points(v_customer, v_win.bonus_action, v_win.bonus_action, v_day, v_date);
      if v_one is not null then v_awarded := v_awarded || v_one; end if;
    end if;
  end loop;

  -- ── Milestones ───────────────────────────────────────────────────────────
  if exists (select 1 from public.profiles where id = v_customer and baseline_data_completed_at is not null) then
    v_one := public.award_journey_points(v_customer, 'baseline', 'baseline', v_day, v_date);
    if v_one is not null then v_awarded := v_awarded || v_one; end if;
  end if;

  -- Body progress: submit_body_progress() already refuses anything short of
  -- four distinct angles, so a record existing at all means a COMPLETE record —
  -- there is nothing extra to verify here. What does need enforcing is the
  -- 14-day checkpoint: without it, four photos a day would out-earn doing the
  -- whole Journey. Walking the records in order (rather than looking only at
  -- the newest) keeps this correct on re-runs and when backfilling history.
  v_last_body := null;
  for v_rec in
    select id, (submitted_at at time zone v_tz)::date as on_date, journey_day
      from public.body_progress_records
     where customer_id = v_customer
     order by submitted_at
  loop
    if exists (
      select 1 from public.journey_point_events
       where customer_id = v_customer and event_key = 'body_progress:' || v_rec.id
    ) then
      v_last_body := v_rec.on_date;      -- already paid: it still anchors the cycle
    elsif v_last_body is null or v_rec.on_date >= v_last_body + 14 then
      v_one := public.award_journey_points(
        v_customer, 'body_progress', 'body_progress:' || v_rec.id, v_rec.journey_day, v_rec.on_date);
      if v_one is not null then v_awarded := v_awarded || v_one; end if;
      v_last_body := v_rec.on_date;
    end if;
  end loop;

  select current_stage, stage_goal_weight_max into v_stage, v_stage_max
    from public.customer_goals where customer_id = v_customer
    order by created_at desc limit 1;
  select weight into v_latest_weight
    from public.daily_checkins
   where customer_id = v_customer and weight is not null
   order by checkin_date desc limit 1;

  -- Reaching the NEAREST edge of the goal band is completion — the same rule
  -- the Dashboard's "第一阶段 X% 完成" already uses. Stage 3+ has no value
  -- seeded, so award_journey_points() simply declines rather than inventing one.
  if v_stage is not null and v_stage_max is not null and v_latest_weight is not null
     and v_latest_weight <= v_stage_max then
    v_one := public.award_journey_points(
      v_customer, 'stage_complete_' || v_stage, 'stage_complete:' || v_stage, v_day, v_date);
    if v_one is not null then v_awarded := v_awarded || v_one; end if;
  end if;

  return v_awarded;
end;
$$;


grant execute on function public.refresh_journey_rewards() to authenticated;
