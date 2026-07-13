-- ---------- Bedtime Check-out (睡前回顾) ----------
-- A separate end-of-day record, distinct from the morning weigh-in's own
-- poop_count field: three quick items only (bowel movement / special
-- conditions / optional notes), designed to take under 30 seconds. No RPC
-- needed — same "plain CRUD under RLS" pattern as daily_checkins, since
-- there are no side effects to enforce atomically.
create type public.bowel_movement_level as enum ('none', 'once', 'two_or_more');

create table public.daily_evening_checkouts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  checkout_date date not null,
  bowel_movement public.bowel_movement_level not null,
  special_conditions text[] not null default '{}',
  notes text,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, checkout_date)
);

create index daily_evening_checkouts_customer_idx on public.daily_evening_checkouts (customer_id, checkout_date desc);

alter table public.daily_evening_checkouts enable row level security;

create policy "evening_checkouts_select_own" on public.daily_evening_checkouts for select using (customer_id = auth.uid());
create policy "evening_checkouts_select_as_coach" on public.daily_evening_checkouts for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "evening_checkouts_select_as_admin" on public.daily_evening_checkouts for select using (public.current_role() = 'admin');

-- "只允许补昨天...超过一天自动失效": enforced here, not just in the UI, so a
-- stale client can never write a checkout for anything other than today or
-- yesterday. No update/delete policy — once submitted, a day's checkout is
-- immutable (no edit flow was requested).
create policy "evening_checkouts_insert_own" on public.daily_evening_checkouts for insert
  with check (customer_id = auth.uid() and checkout_date between (current_date - 1) and current_date);

revoke truncate on public.daily_evening_checkouts from anon, authenticated;
