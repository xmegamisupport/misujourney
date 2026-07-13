-- ---------- AI trend analysis + Coach attention flags ----------
-- Three new tables. Two pre-existing gaps had to be closed first for this to
-- have anything real to analyze:
--   1. Water intake was localStorage-only, never persisted server-side —
--      daily_water_logs closes that (customer_goals.water_target_ml already
--      gives the fixed per-stage target to compare each day's total against).
--   2. The Coach customer roster was still 100% Phase-1 mock data with no
--      real per-customer query path at all — out of scope for this
--      migration itself, but noted here since it's why attention flags and
--      AI insights need coach_id-scoped RLS exactly like every other
--      customer-data table already has.

create table public.daily_water_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  total_ml integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, log_date)
);

alter table public.daily_water_logs enable row level security;

create policy "water_logs_select_own" on public.daily_water_logs for select using (customer_id = auth.uid());
create policy "water_logs_select_as_coach" on public.daily_water_logs for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "water_logs_select_as_admin" on public.daily_water_logs for select using (public.current_role() = 'admin');
-- Both insert and update policies are needed: an upsert (insert ... on
-- conflict do update) always attempts the insert path first.
create policy "water_logs_insert_own" on public.daily_water_logs for insert with check (customer_id = auth.uid());
create policy "water_logs_update_own" on public.daily_water_logs for update using (customer_id = auth.uid());

revoke truncate on public.daily_water_logs from anon, authenticated;

-- ---------- Fixed-rule attention flags (no AI) ----------
-- Recomputed as a cheap sync (resolve what's no longer triggered, insert
-- what's newly triggered) any time a trend summary is built — after a
-- checkout submit, or whenever a customer/coach/admin views one. These are
-- reminders for a Coach, not medical judgments — severity is capped at
-- info/attention/important, deliberately no danger/critical tier.
create table public.customer_attention_flags (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  flag_type text not null,
  flag_label text not null,
  severity text not null check (severity in ('info', 'attention', 'important')),
  source_start_date date not null,
  source_end_date date not null,
  is_active boolean not null default true,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_attention_flags_customer_idx on public.customer_attention_flags (customer_id, is_active);

alter table public.customer_attention_flags enable row level security;

create policy "attention_flags_select_own" on public.customer_attention_flags for select using (customer_id = auth.uid());
create policy "attention_flags_select_as_coach" on public.customer_attention_flags for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "attention_flags_select_as_admin" on public.customer_attention_flags for select using (public.current_role() = 'admin');
create policy "attention_flags_insert_own_or_coach" on public.customer_attention_flags for insert
  with check (customer_id = auth.uid() or customer_id in (select id from public.profiles where coach_id = auth.uid()) or public.current_role() = 'admin');
create policy "attention_flags_update_own_or_coach" on public.customer_attention_flags for update
  using (customer_id = auth.uid() or customer_id in (select id from public.profiles where coach_id = auth.uid()) or public.current_role() = 'admin');

revoke truncate on public.customer_attention_flags from anon, authenticated;

-- ---------- AI-generated weekly/biweekly trend summaries ----------
-- generated_date is derived so "once per customer per analysis_type per
-- day" is enforced by a real unique constraint, not just an application-
-- level check (which a race or a retried request could slip past).
create table public.customer_ai_insights (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  analysis_type text not null check (analysis_type in ('weekly_7_day', 'biweekly_14_day')),
  summary text not null,
  possible_factors jsonb not null default '[]'::jsonb,
  positive_progress jsonb not null default '[]'::jsonb,
  coach_focus jsonb not null default '[]'::jsonb,
  customer_message text not null,
  data_quality text not null check (data_quality in ('sufficient', 'limited')),
  medical_caution boolean not null default false,
  source_data jsonb not null,
  generated_at timestamptz not null default now(),
  generated_date date generated always as ((generated_at at time zone 'utc')::date) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, analysis_type, generated_date)
);

create index customer_ai_insights_customer_idx on public.customer_ai_insights (customer_id, analysis_type, generated_at desc);

alter table public.customer_ai_insights enable row level security;

create policy "ai_insights_select_own" on public.customer_ai_insights for select using (customer_id = auth.uid());
create policy "ai_insights_select_as_coach" on public.customer_ai_insights for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "ai_insights_select_as_admin" on public.customer_ai_insights for select using (public.current_role() = 'admin');
-- No update policy: a day's insight is immutable once generated — the next
-- eligible write is a new row (a new day, so a new generated_date).
create policy "ai_insights_insert_own_or_coach" on public.customer_ai_insights for insert
  with check (customer_id = auth.uid() or customer_id in (select id from public.profiles where coach_id = auth.uid()) or public.current_role() = 'admin');

revoke truncate on public.customer_ai_insights from anon, authenticated;
