-- ═══════════════════════════════════════════════════════════════════════════
-- Glowing You — Discovery System (schema)
--
-- A data-driven "growth companion" layer: hidden discoveries with evolving
-- clues. Everything is config so hundreds of future discoveries are pure data
-- inserts. Writes happen ONLY through SECURITY DEFINER functions (see the
-- engine migration); the browser can never mint a discovery.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extensible trigger-type registry ───────────────────────────────────────
create table if not exists public.discovery_trigger_types (
  key text primary key,
  description text not null,
  enabled boolean not null default true
);

-- ── Tunable engine settings (data-driven, not hardcoded) ────────────────────
create table if not exists public.discovery_settings (
  key text primary key,
  value text not null,
  description text
);

-- ── What counts as "meaningful progress" (configurable) ─────────────────────
create table if not exists public.discovery_progress_signals (
  key text primary key,
  description text not null,
  enabled boolean not null default true
);

-- ── Achievement catalogue ───────────────────────────────────────────────────
create table if not exists public.discovery_achievements (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  icon text not null,
  description text not null,
  category text not null,
  rarity text not null default 'common',
  trigger_type text not null references public.discovery_trigger_types(key),
  trigger_condition jsonb not null default '{}'::jsonb,
  -- per-achievement hint pacing (refinement #4)
  hint_advance_days integer not null default 10 check (hint_advance_days > 0),
  -- reveal ordering / spacing (refinement #5): lower reveals first
  discovery_priority integer not null default 100,
  -- future-data achievements stay inactive rather than being removed (refinement #2)
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.discovery_hints (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.discovery_achievements(id) on delete cascade,
  stage integer not null check (stage >= 1),
  hint_text text not null,
  unique (achievement_id, stage)
);

-- ── Per-user state ───────────────────────────────────────────────────────────
create table if not exists public.user_discoveries (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.discovery_achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  -- null until the reveal animation has been shown (drip, one at a time)
  revealed_at timestamptz,
  primary key (user_id, achievement_id)
);
create index if not exists user_discoveries_reveal_idx
  on public.user_discoveries (user_id) where revealed_at is null;

create table if not exists public.user_discovery_clues (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.discovery_achievements(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  current_stage integer not null default 1,
  stage_advanced_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.discovery_engine_logs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_progress_date date,
  clue_rotation_date date,
  last_reveal_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.discovery_trigger_types enable row level security;
alter table public.discovery_settings enable row level security;
alter table public.discovery_progress_signals enable row level security;
alter table public.discovery_achievements enable row level security;
alter table public.discovery_hints enable row level security;
alter table public.user_discoveries enable row level security;
alter table public.user_discovery_clues enable row level security;
alter table public.discovery_engine_logs enable row level security;

-- Config tables carry NO policies: only the SECURITY DEFINER engine reads them,
-- so nothing (hints, conditions) is exposed directly to the browser.

-- Per-user tables: owner may read their own rows; writes are DEFINER-only, so
-- there are deliberately no insert/update/delete policies.
create policy "own discoveries read" on public.user_discoveries
  for select to authenticated using (auth.uid() = user_id);
create policy "own clues read" on public.user_discovery_clues
  for select to authenticated using (auth.uid() = user_id);
create policy "own engine log read" on public.discovery_engine_logs
  for select to authenticated using (auth.uid() = user_id);

grant select on public.user_discoveries to authenticated;
grant select on public.user_discovery_clues to authenticated;
grant select on public.discovery_engine_logs to authenticated;

-- ── Streak helper (longest run of consecutive dates) ────────────────────────
create or replace function public.discovery_longest_streak(p_dates date[])
returns integer
language sql
immutable
set search_path = ''
as $$
  with d as (select distinct unnest(p_dates) as dt where p_dates is not null),
  g as (select dt, dt - (row_number() over (order by dt))::int as grp from d)
  select coalesce(max(cnt), 0) from (select count(*) as cnt from g group by grp) s;
$$;
