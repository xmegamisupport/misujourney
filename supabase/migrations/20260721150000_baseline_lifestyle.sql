-- Journey Baseline data → lifestyle habits BEFORE the Journey starts.
-- Weight is NOT re-asked here (it was captured at registration → start_weight,
-- which also drives the fixed water target); we drop the duplicate
-- baseline_weight and record usual sleep / bowel / hydration habits instead.

alter table public.profiles
  add column if not exists baseline_bowel_habit text,
  add column if not exists baseline_hydration_habit text,
  drop column if exists baseline_weight;

-- Old (weight-based) signature is retired.
drop function if exists public.record_journey_baseline(numeric, text, text);

-- New: usual sleep window + bowel + hydration lifestyle baseline. Overnight
-- sleep is fine — bedtime and wake time are stored independently, never
-- cross-validated. Never touches start_weight or the water target.
create or replace function public.record_journey_baseline(
  p_bedtime text,
  p_wake_time text,
  p_bowel_habit text,
  p_hydration_habit text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception '请先登录';
  end if;
  if coalesce(trim(p_bedtime), '') = '' or coalesce(trim(p_wake_time), '') = '' then
    raise exception '请填写平常的睡眠时间';
  end if;
  if coalesce(trim(p_bowel_habit), '') = '' then
    raise exception '请选择平时的排便习惯';
  end if;
  if coalesce(trim(p_hydration_habit), '') = '' then
    raise exception '请选择平时的喝水习惯';
  end if;

  update public.profiles set
    baseline_bedtime = trim(p_bedtime),
    baseline_wake_time = trim(p_wake_time),
    baseline_bowel_habit = trim(p_bowel_habit),
    baseline_hydration_habit = trim(p_hydration_habit),
    baseline_data_completed_at = now(),
    updated_at = now()
  where id = auth.uid();
end;
$$;

revoke execute on function public.record_journey_baseline(text, text, text, text) from anon, public;
grant execute on function public.record_journey_baseline(text, text, text, text) to authenticated;
