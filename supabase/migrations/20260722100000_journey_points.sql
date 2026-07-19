-- ═══════════════════════════════════════════════════════════════════════════
-- Journey Points V1
--
-- The core design decision: points are DERIVED, never INCREMENTED.
--
-- There is no `profiles.journey_points` counter anywhere. Instead there is an
-- append-only ledger of events, and every balance is sum(points). This costs
-- one extra table and buys three things that a counter can never give back:
--
--   1. Idempotency. `unique (customer_id, event_key)` makes a double-submit,
--      a network retry, or a duplicate refresh physically incapable of paying
--      twice. A counter has to be defended by application code forever.
--
--   2. Re-tunability. Every value in here is a guess — we have no customer
--      behaviour data at all yet (see docs/PRODUCT_DECISIONS.md). Values live
--      in `journey_point_values`, so re-tuning is an UPDATE plus a re-run, and
--      existing customers are re-scored on the same rules as new ones. With a
--      counter, a re-tune silently splits the customer base into two eras.
--
--   3. The instrumentation we don't otherwise have. "Who did what, on which
--      Journey day" is the question we have been unable to answer all along.
--      Points are arguably the by-product; this table is the asset.
--
-- Everything is recomputed from the real tables by refresh_journey_rewards(),
-- which is safe to call any number of times. That means the system is
-- self-healing: a missed call, an offline write, or a bug fixed next week is
-- repaired by the next refresh rather than needing a data migration.
--
-- Anti-abuse posture for V1 is deliberate, not accidental. Points are not
-- redeemable, so faking a meal photo buys a bigger number and nothing else;
-- the cheap server-side checks below (a meal must contain identified food, a
-- body record must be 14 days after the last paid one) catch the lazy cases.
-- Serious fraud defence is DEFERRED until points become spendable — and that
-- is a hard trigger, not a date. See the decision log.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tunable values ─────────────────────────────────────────────────────────
create table if not exists public.journey_point_values (
  action text primary key,
  points integer not null check (points > 0),
  label text not null,
  emoji text not null default '🌱',
  updated_at timestamptz not null default now()
);

alter table public.journey_point_values enable row level security;

-- Not secret: the customer is allowed to know what things are worth.
create policy "anyone signed in can read point values"
  on public.journey_point_values for select
  to authenticated using (true);

insert into public.journey_point_values (action, points, label, emoji) values
  -- Daily. Max 125/day, and deliberately ordered by (how hard to fake) x (how
  -- useful the data is): a meal photo goes through AI recognition and is worth
  -- double the water goal, which is four taps on a button.
  ('weighin',          20, '完成今日晨重',   '⚖️'),
  ('learning',         10, '完成今日学习',   '📚'),
  ('water',            15, '达成今日饮水',   '💧'),
  ('meal',             30, '完成饮食打卡',   '🍽️'),
  ('reflection',       20, '完成今日回顾',   '🌙'),
  ('daily_complete',   30, '完成今天的 Journey', '🌱'),
  -- Consistency, measured over a WINDOW rather than a chain, so a sick day
  -- costs one day instead of everything. See the decision log.
  ('consistency_7',   150, '过去 7 天完成 5 天', '🔥'),
  ('consistency_14',  300, '过去 14 天完成 10 天', '🔥'),
  ('consistency_30',  800, '过去 30 天完成 21 天', '🔥'),
  ('consistency_60', 1500, '过去 60 天完成 42 天', '🔥'),
  -- Milestones. Worth more because they produce the data nobody else can give
  -- us and they are genuinely infrequent.
  ('baseline',        200, '完成 Journey 起点', '🎉'),
  ('body_progress',   200, '完成身形记录',   '📷'),
  ('stage_complete_1', 300, '完成第一阶段',  '🏆'),
  ('stage_complete_2', 500, '完成第二阶段',  '🏆')
on conflict (action) do nothing;

-- ── The ledger ─────────────────────────────────────────────────────────────
create table if not exists public.journey_point_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  action text not null references public.journey_point_values(action),
  -- What this payment is FOR, uniquely. "weighin:2026-07-19", "body_progress:<uuid>".
  -- The unique index on it is the entire double-payment defence.
  event_key text not null,
  -- Copied at award time, not joined: re-tuning values later must not silently
  -- rewrite what a customer was already told they earned.
  points integer not null check (points > 0),
  journey_day integer,
  earned_on date not null,
  created_at timestamptz not null default now()
);

create unique index if not exists journey_point_events_key_uniq
  on public.journey_point_events (customer_id, event_key);
create index if not exists journey_point_events_customer_date_idx
  on public.journey_point_events (customer_id, earned_on desc);

alter table public.journey_point_events enable row level security;

-- SELECT only, own rows only. There is deliberately NO insert/update/delete
-- policy for anyone: the only way a row can ever appear is through the
-- SECURITY DEFINER function below, so points cannot be minted from a browser
-- console no matter what the client is tricked into sending.
create policy "customers read their own point events"
  on public.journey_point_events for select
  to authenticated using (auth.uid() = customer_id);

-- ── Award helper ───────────────────────────────────────────────────────────
-- SECURITY INVOKER on purpose: it inherits the caller's rights, and the only
-- caller is the DEFINER function below. Execute is revoked from customers so
-- this can never be called directly with a hand-picked action and event_key.
create or replace function public.award_journey_points(
  p_customer uuid,
  p_action text,
  p_event_key text,
  p_journey_day integer,
  p_earned_on date
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_points integer;
  v_label text;
  v_emoji text;
begin
  select points, label, emoji into v_points, v_label, v_emoji
    from public.journey_point_values where action = p_action;
  if v_points is null then
    return null;
  end if;

  insert into public.journey_point_events (customer_id, action, event_key, points, journey_day, earned_on)
  values (p_customer, p_action, p_event_key, v_points, p_journey_day, p_earned_on)
  on conflict (customer_id, event_key) do nothing;

  -- FOUND is false when ON CONFLICT skipped the insert — i.e. already paid.
  if not found then
    return null;
  end if;

  return jsonb_build_object('action', p_action, 'points', v_points, 'label', v_label, 'emoji', v_emoji);
end;
$$;

revoke all on function public.award_journey_points(uuid, text, text, integer, date) from public, anon, authenticated;

-- ── The one entry point ────────────────────────────────────────────────────
-- Recomputes every award the customer is currently owed, from the real tables.
-- Returns ONLY what was newly awarded by this call, which is exactly what the
-- UI needs to animate. Safe to call as often as you like.
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
  select exists (
    select 1 from public.daily_checkins
     where customer_id = v_customer and checkin_date = v_date and weight is not null
  ) into v_has_weighin;

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

  if v_has_weighin then
    v_one := public.award_journey_points(v_customer, 'weighin', 'weighin:' || v_date, v_day, v_date);
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

-- ── Read model ─────────────────────────────────────────────────────────────
create or replace function public.get_my_journey_points()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total', coalesce((select sum(points) from public.journey_point_events where customer_id = auth.uid()), 0),
    'today', coalesce((select sum(points) from public.journey_point_events
                        where customer_id = auth.uid()
                          and earned_on = public.customer_journey_date(auth.uid())), 0)
  );
$$;

grant execute on function public.get_my_journey_points() to authenticated;
