-- Fixes data attribution between morning check-in and evening checkout
-- ("睡前回顾"): bowel movement was being asked for on the MORNING form
-- (daily_checkins.poop_count) even though a customer can't know how many
-- times they'll go before the day has even started — it belongs to the
-- evening checkout, keyed by checkout_date, which already exists and is
-- already what Coach/AI trend analysis reads (daily_evening_checkouts /
-- checkout_date). This migration stops new morning check-ins from writing
-- poop_count at all (column made nullable, not dropped — old rows keep
-- their historical value) and adds proper cross-midnight sleep tracking
-- columns to the same daily_checkins row (no new table — sleep has always
-- lived here via bedtime/wake_time, this just makes it a real timestamp
-- range + duration instead of two bare time-of-day values).

alter table public.daily_checkins
  alter column poop_count drop not null,
  add column sleep_start_at timestamptz,
  add column sleep_end_at timestamptz,
  add column sleep_duration_minutes integer;

-- record_morning_checkin()'s parameter list is changing (p_poop_count
-- removed), so the old signature must be dropped first.
drop function public.record_morning_checkin(uuid, uuid, date, numeric, poop_count, time, time);

create function public.record_morning_checkin(
  p_checkin_id uuid,
  p_customer_id uuid,
  p_date date,
  p_weight numeric,
  p_bedtime time without time zone,
  p_wake_time time without time zone
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_bed_date date;
  v_sleep_start timestamptz;
  v_sleep_end timestamptz;
  v_duration integer;
begin
  if auth.uid() is distinct from p_customer_id then
    raise exception '只能记录自己的晨重';
  end if;

  if p_date is distinct from public.customer_journey_date(p_customer_id) then
    raise exception '只能记录今天的晨重';
  end if;

  if exists (select 1 from public.daily_checkins where customer_id = p_customer_id and checkin_date = p_date) then
    return jsonb_build_object('ok', true, 'alreadyRecorded', true);
  end if;

  select coalesce(timezone, 'Asia/Kuala_Lumpur') into v_tz from public.profiles where id = p_customer_id;

  -- Sleep is cross-midnight: bedtime is "last night" unless it's numerically
  -- before wake_time on the clock (e.g. both after midnight), in which case
  -- it's treated as the same calendar day as wake — same rule the old
  -- client-only duration display already used, just now also producing real
  -- timestamps instead of a display-only string.
  v_bed_date := case when p_bedtime >= p_wake_time then p_date - 1 else p_date end;
  v_sleep_start := (v_bed_date + p_bedtime) at time zone v_tz;
  v_sleep_end := (p_date + p_wake_time) at time zone v_tz;
  v_duration := round(extract(epoch from (v_sleep_end - v_sleep_start)) / 60);

  insert into public.daily_checkins
    (id, customer_id, checkin_date, weight, poop_count, bedtime, wake_time, sleep_start_at, sleep_end_at, sleep_duration_minutes)
  values
    (p_checkin_id, p_customer_id, p_date, p_weight, null, p_bedtime, p_wake_time, v_sleep_start, v_sleep_end, v_duration);

  update public.daily_journeys set status = 'completed', updated_at = now()
    where customer_id = p_customer_id and status = 'active' and journey_date < p_date;

  insert into public.daily_journeys (customer_id, journey_date, status, started_at, start_method, morning_weight_status)
    values (p_customer_id, p_date, 'active', now(), 'morning_weight', 'completed')
  on conflict (customer_id, journey_date) do update
    set status = 'active',
        started_at = coalesce(public.daily_journeys.started_at, now()),
        start_method = 'morning_weight',
        morning_weight_status = 'completed',
        updated_at = now();

  return jsonb_build_object('ok', true, 'alreadyRecorded', false);
end;
$$;

-- DROP FUNCTION wipes any prior grants.
revoke execute on function public.record_morning_checkin(uuid, uuid, date, numeric, time, time) from anon;
grant execute on function public.record_morning_checkin(uuid, uuid, date, numeric, time, time) to authenticated;
