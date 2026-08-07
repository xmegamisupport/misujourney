-- ═══════════════════════════════════════════════════════════════════════════
-- Food Library · Phase 2A Sprint 2 — Operations schema (additive)
--
-- Governance foundation only (no import pipeline yet, no UI, no AI):
--   • metadata: foods.dietary_tags, food_nutrition.serving_name
--   • foods.status gains 'in_review' + 'archived'
--   • Recognition Inbox: food_match_misses lifecycle + priority score
--   • Roles: food_staff (Food Editor / Reviewer / Admin) + helper predicates
--   • Maker-checker: food_change_proposals
--   • Audit: food_audit_log
--   • Priority scoring function
-- meals / food_portions untouched. Everything additive + backward compatible.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Metadata (the only two new food fields — kept lean) ─────────────────────
alter table public.foods
  add column if not exists dietary_tags text[] not null default '{}';   -- halal/vegetarian/vegan/spicy/…

alter table public.food_nutrition
  add column if not exists serving_name text;                            -- "1 plate / 一碗"

-- foods.status: add draft→in_review→active→archived (+ merged). No data yet.
alter table public.foods drop constraint if exists foods_status_check;
alter table public.foods
  add constraint foods_status_check
  check (status in ('draft','in_review','active','archived','merged'));

-- ── Recognition Inbox: upgrade food_match_misses into an operational queue ────
alter table public.food_match_misses
  add column if not exists status text not null default 'new'
    check (status in ('new','reviewing','published','ignored')),
  add column if not exists priority_score numeric not null default 0,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists claimed_by uuid references public.profiles(id) on delete set null,
  add column if not exists claimed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists idx_match_misses_status   on public.food_match_misses (status);
create index if not exists idx_match_misses_priority on public.food_match_misses (priority_score desc);

-- ── Roles: food_staff (decoupled from user_role) ────────────────────────────
create table if not exists public.food_staff (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  food_role  text not null check (food_role in ('food_editor','food_reviewer','food_admin')),
  is_active  boolean not null default true,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now()
);

-- Caller's effective food role: an app admin is always a Food Admin.
create or replace function public.my_food_role()
returns text language sql security definer stable set search_path = '' as $$
  select case
    when public.current_role() = 'admin'::public.user_role then 'food_admin'
    else (select food_role from public.food_staff where user_id = auth.uid() and is_active)
  end;
$$;
-- coalesce → false so a NULL (non-staff) role never slips past `if not food_can_edit()`.
create or replace function public.food_can_edit()   returns boolean language sql stable set search_path = '' as $$ select coalesce(public.my_food_role() in ('food_editor','food_reviewer','food_admin'), false); $$;
create or replace function public.food_can_review() returns boolean language sql stable set search_path = '' as $$ select coalesce(public.my_food_role() in ('food_reviewer','food_admin'), false); $$;
create or replace function public.food_is_admin()   returns boolean language sql stable set search_path = '' as $$ select coalesce(public.my_food_role() = 'food_admin', false); $$;

-- ── Maker-checker: change proposals for high-risk actions ───────────────────
create table if not exists public.food_change_proposals (
  id             uuid primary key default gen_random_uuid(),
  proposal_type  text not null
                 check (proposal_type in ('publish_food','publish_nutrition','merge','archive','change_primary_source')),
  target_food_id uuid references public.foods(id) on delete cascade,
  payload        jsonb not null default '{}'::jsonb,   -- e.g. {nutrition_id} / {merge_into_id}
  status         text not null default 'pending'
                 check (status in ('pending','approved','rejected','cancelled')),
  submitted_by   uuid not null references public.profiles(id) on delete set null,
  submitted_at   timestamptz not null default now(),
  reviewed_by    uuid references public.profiles(id) on delete set null,
  reviewed_at    timestamptz,
  review_note    text
);
create index if not exists idx_proposals_status on public.food_change_proposals (status, submitted_at);
create index if not exists idx_proposals_food   on public.food_change_proposals (target_food_id);

-- ── Audit log (append-only) ─────────────────────────────────────────────────
create table if not exists public.food_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid references public.profiles(id) on delete set null,
  action      text not null,               -- 'alias.add','nutrition.publish','food.merge',…
  entity_type text not null,               -- 'food','alias','nutrition','proposal','inbox','staff'
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  at          timestamptz not null default now()
);
create index if not exists idx_food_audit_entity on public.food_audit_log (entity_type, entity_id, at desc);
create index if not exists idx_food_audit_actor  on public.food_audit_log (actor, at desc);

-- ── Priority scoring (deterministic; higher = surface first) ────────────────
-- occurrences ↑ · recency ↑ (decays over 14d) · low confidence ↑ · no similar
-- food yet ↑ (a genuinely missing dish beats a probable duplicate-alias).
create or replace function public.food_inbox_priority(
  p_occurrences integer,
  p_last_seen   timestamptz,
  p_confidence  numeric,
  p_has_similar boolean
)
returns numeric language sql stable set search_path = '' as $$
  select round((
      3 * ln(greatest(p_occurrences, 0) + 1)
    + 2 * greatest(0, 1 - (extract(epoch from (now() - p_last_seen)) / (86400 * 14)))
    + 1 * (1 - coalesce(p_confidence, 0.5))
    + 2 * (case when p_has_similar then 0 else 1 end)
  )::numeric, 2);
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.food_staff             enable row level security;
alter table public.food_change_proposals  enable row level security;
alter table public.food_audit_log         enable row level security;

-- Staff can see the roster + proposals; auditors (reviewers+) see the log.
-- All writes go through SECURITY DEFINER RPCs (Migration B) — direct writes closed.
create policy food_staff_select_staff        on public.food_staff            for select to authenticated using (public.food_can_edit());
create policy food_proposals_select_staff    on public.food_change_proposals for select to authenticated using (public.food_can_edit());
create policy food_audit_select_reviewer     on public.food_audit_log        for select to authenticated using (public.food_can_review());

-- Food staff (not only admins) may now read the Recognition Inbox.
create policy food_match_misses_select_staff on public.food_match_misses     for select to authenticated using (public.food_can_edit());
