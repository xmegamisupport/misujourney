-- Body Progress Module (SP-005) — Sprint 001: Database foundation only.
-- Stores Original Images only (no preview/lifecycle columns yet — those
-- arrive in a later migration when that feature is actually built).
-- All writes are RPC-only (Sprint 002); these tables carry SELECT-only RLS.

create type public.body_progress_angle as enum ('front', 'left', 'right', 'back');

create table public.body_progress_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  journey_day int not null,
  journey_plan_days smallint not null,
  submitted_at timestamptz not null default now(),
  weight_value numeric(5, 1),
  weight_unit text,
  source_checkin_id uuid references public.daily_checkins (id) on delete set null,
  source_checkin_date date,
  created_at timestamptz not null default now()
);

create index body_progress_records_customer_idx on public.body_progress_records (customer_id, submitted_at desc);

create table public.body_progress_photos (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.body_progress_records (id) on delete cascade,
  angle public.body_progress_angle not null,
  original_path text not null,
  created_at timestamptz not null default now(),
  unique (record_id, angle)
);

alter table public.body_progress_records enable row level security;
alter table public.body_progress_photos enable row level security;

create policy "body_progress_records_select_own" on public.body_progress_records for select using (customer_id = auth.uid());
create policy "body_progress_records_select_as_coach" on public.body_progress_records for select using (customer_id in (select id from public.profiles where coach_id = auth.uid()));
create policy "body_progress_records_select_as_admin" on public.body_progress_records for select using (public.current_role() = 'admin');

create policy "body_progress_photos_select_own" on public.body_progress_photos for select using (record_id in (select id from public.body_progress_records where customer_id = auth.uid()));
create policy "body_progress_photos_select_as_coach" on public.body_progress_photos for select using (record_id in (select id from public.body_progress_records where customer_id in (select id from public.profiles where coach_id = auth.uid())));
create policy "body_progress_photos_select_as_admin" on public.body_progress_photos for select using (public.current_role() = 'admin');
