-- Journey Baseline — a one-time, OPTIONAL setup shown after onboarding and
-- reminded on the Dashboard until done. Two items:
--   1. Starting photos  → reuses the existing Body Progress capture (a
--      body_progress_records row = photos done; no new storage here).
--   2. Starting data     → current weight + usual sleep time, recorded below.
--
-- Never mandatory: the customer can skip and the reminder simply persists.
-- Additive only — no existing column/policy/RPC changed.

alter table public.profiles
  add column if not exists baseline_weight numeric,
  add column if not exists baseline_bedtime text,
  add column if not exists baseline_wake_time text,
  add column if not exists baseline_data_completed_at timestamptz;

-- Record the Journey-start data on the caller's own profile. profiles has no
-- direct UPDATE grant for these fields, so this goes through a SECURITY DEFINER
-- RPC scoped to auth.uid().
create or replace function public.record_journey_baseline(
  p_weight numeric,
  p_bedtime text,
  p_wake_time text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception '请先登录';
  end if;
  if p_weight is null or p_weight <= 0 then
    raise exception '请输入有效的体重';
  end if;

  update public.profiles set
    baseline_weight = p_weight,
    baseline_bedtime = nullif(trim(p_bedtime), ''),
    baseline_wake_time = nullif(trim(p_wake_time), ''),
    baseline_data_completed_at = now(),
    updated_at = now()
  where id = auth.uid();
end;
$$;

revoke execute on function public.record_journey_baseline(numeric, text, text) from anon, public;
grant execute on function public.record_journey_baseline(numeric, text, text) to authenticated;
