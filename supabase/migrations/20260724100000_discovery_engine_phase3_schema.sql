-- ═══════════════════════════════════════════════════════════════════════════
-- Hidden Discovery — Phase 3 Engine: schema
--
-- Unifies the runtime on the JSON Registry (single source of truth) and adds
-- the storage the event-driven engine needs: richer catalogue columns, unlock
-- evidence + scope, and a backend celebration queue. Safe to restructure the
-- unlock store — audited: 0 real unlocks exist at time of writing.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Catalogue: columns the Registry carries but the DB did not ──────────────
alter table public.discovery_achievements
  add column if not exists celebration_type text,
  add column if not exists unlock_scope text not null default 'lifetime',
  add column if not exists registry_version text;

-- lifetime = once ever · per_journey / per_stage = once per journey/stage
-- repeatable = intentionally many (not yet used; see Engine doc).
alter table public.discovery_achievements
  drop constraint if exists discovery_achievements_unlock_scope_chk;
alter table public.discovery_achievements
  add constraint discovery_achievements_unlock_scope_chk
  check (unlock_scope in ('lifetime', 'per_journey', 'per_stage', 'repeatable'));

-- ── Extensible trigger-type registry: add the Phase-3 types ─────────────────
insert into public.discovery_trigger_types (key, description) values
  ('consecutive_days',   'N consecutive qualifying days of a signal'),
  ('accumulated_count',  'A signal reaches N total qualifying occurrences'),
  ('goal_achievement',   'A user-set personal stage goal is reached'),
  ('journey_completion', 'A journey of the configured length is completed'),
  ('calendar_condition', 'A signal under a date / weekday / time-of-day rule'),
  ('weight_delta',       'Weight reduced from the journey baseline by N kg'),
  ('comeback',           'Return after an inactivity gap, then N consecutive days'),
  ('custom',             'Escape hatch — an engine-defined named rule')
on conflict (key) do nothing;

-- ── Unlock store: evidence, scope keys, and a stable surrogate id ───────────
-- (0 rows today, so restructuring the primary key is safe.)
alter table public.user_discoveries
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists source_event text,
  add column if not exists journey_id uuid,
  add column if not exists stage integer,
  add column if not exists trigger_evidence jsonb,
  add column if not exists registry_version text;

alter table public.user_discoveries drop constraint if exists user_discoveries_pkey;
alter table public.user_discoveries add constraint user_discoveries_pkey primary key (id);

-- Scope-aware uniqueness = database-level idempotency. A lifetime discovery
-- (journey_id/stage NULL) is unique per (user, achievement); per_journey and
-- per_stage additionally key on journey/stage. This is the arbiter that makes
-- double-processed events safe — not an app-level check-then-insert.
create unique index if not exists ux_user_discoveries_scope
  on public.user_discoveries (
    user_id,
    achievement_id,
    coalesce(journey_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(stage, -1)
  );

-- ── Celebration queue: backend-ready hand-off for a future presentation UI ──
create table if not exists public.discovery_celebration_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  discovery_unlock_id uuid not null references public.user_discoveries(id) on delete cascade,
  achievement_id uuid not null references public.discovery_achievements(id) on delete cascade,
  -- pending → ready → displayed → acknowledged (or expired)
  status text not null default 'pending',
  -- higher shows first: rarity rank first, then the discovery's own priority
  priority integer not null default 0,
  queued_at timestamptz not null default now(),
  displayed_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  -- one queue row per unlock ⇒ re-queuing the same unlock is a no-op
  unique (discovery_unlock_id)
);

alter table public.discovery_celebration_queue
  drop constraint if exists discovery_celebration_queue_status_chk;
alter table public.discovery_celebration_queue
  add constraint discovery_celebration_queue_status_chk
  check (status in ('pending', 'ready', 'displayed', 'acknowledged', 'expired'));

create index if not exists discovery_celebration_queue_user_status_idx
  on public.discovery_celebration_queue (user_id, status, priority desc, queued_at);

-- ── RLS: owner may read their own queue; all writes are DEFINER-only ────────
alter table public.discovery_celebration_queue enable row level security;
create policy "own celebration queue read" on public.discovery_celebration_queue
  for select to authenticated using (auth.uid() = user_id);
grant select on public.discovery_celebration_queue to authenticated;
