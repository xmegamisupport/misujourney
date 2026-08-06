-- ═══════════════════════════════════════════════════════════════════════════
-- Food Library — Phase 2A · Sprint 1 (database foundation only)
--
-- Additive + backward compatible. Creates the canonical Food Library core:
--   foods · food_aliases · food_sources · food_nutrition · food_match_misses
-- Seeds ONLY food_sources. No food rows. No AI, no UI, no data migration.
-- meals and food_portions are NOT touched. Existing behaviour is unchanged.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 3. food_sources ─────────────────────────────────────────────────────────
-- Provenance + trust registry. priority = which source wins on conflict (higher
-- wins). is_active = wired-in-and-usable (only manual is active this sprint).
create table if not exists public.food_sources (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,          -- 'manual','usda','off','myfcd','fatsecret'
  name       text not null,
  priority   integer not null default 100,  -- higher wins when the same food has multiple sources
  license    text,
  website    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── 1. foods ────────────────────────────────────────────────────────────────
-- The canonical food. One row per real food. primary_nutrition_id is added as a
-- FK AFTER food_nutrition exists (the two reference each other).
create table if not exists public.foods (
  id                    uuid primary key default gen_random_uuid(),
  canonical_name        text not null,
  cuisine               text not null default 'other'
                        check (cuisine in ('malaysian','chinese','western','japanese','fast_food','beverage','dessert','packaged','generic','other')),
  kind                  text not null default 'dish'
                        check (kind in ('dish','ingredient','packaged','branded')),
  brand                 text,
  -- Optional bridge to the existing 211 fallback: which food_portions category
  -- best represents this food's plate role. Nullable; not enforced as a FK so
  -- food_portions stays completely untouched.
  plate_category        text,
  status                text not null default 'active'
                        check (status in ('active','draft','merged','retired')),
  merged_into_id        uuid references public.foods(id) on delete set null,
  primary_nutrition_id  uuid,  -- FK added below, after food_nutrition exists
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── 2. food_aliases ─────────────────────────────────────────────────────────
-- Many names → one food. normalized_key drives deterministic matching.
create table if not exists public.food_aliases (
  id             uuid primary key default gen_random_uuid(),
  food_id        uuid not null references public.foods(id) on delete cascade,
  alias          text not null,
  normalized_key text not null,               -- lowercased/trimmed/punct-stripped
  language       text not null default 'en'
                 check (language in ('en','zh','ms','ja','other')),
  match_type     text not null default 'synonym'
                 check (match_type in ('canonical','synonym','brand','romanization','ocr','ai','other')),
  priority       integer not null default 100,
  created_at     timestamptz not null default now(),
  unique (food_id, normalized_key)            -- no duplicate alias within a food
);

-- ── 4. food_nutrition ───────────────────────────────────────────────────────
-- Versioned, multi-source, append-only. New data = new row (never overwrite).
-- Exactly one row per (food, basis) may be is_current (enforced by a partial
-- unique index below).
create table if not exists public.food_nutrition (
  id           uuid primary key default gen_random_uuid(),
  food_id      uuid not null references public.foods(id) on delete cascade,
  source_id    uuid not null references public.food_sources(id) on delete restrict,
  basis        text not null check (basis in ('per_100g','per_serving')),
  serving_g    numeric check (serving_g is null or serving_g > 0),
  calories     numeric not null default 0 check (calories >= 0),
  protein      numeric not null default 0 check (protein >= 0),
  carbohydrate numeric not null default 0 check (carbohydrate >= 0),
  fat          numeric not null default 0 check (fat >= 0),
  fiber        numeric not null default 0 check (fiber >= 0),
  sodium_mg    numeric check (sodium_mg is null or sodium_mg >= 0),  -- extensible
  sugar_g      numeric check (sugar_g is null or sugar_g >= 0),      -- extensible
  version      integer not null default 1 check (version >= 1),
  is_current   boolean not null default true,
  valid_from   date not null default current_date,
  raw_payload  jsonb,                          -- original values as received from the source
  created_at   timestamptz not null default now()
);

-- foods ↔ food_nutrition mutual reference: add the FK now that both exist.
alter table public.foods
  add constraint foods_primary_nutrition_fk
  foreign key (primary_nutrition_id) references public.food_nutrition(id) on delete set null;

-- ── 5. food_match_misses ────────────────────────────────────────────────────
-- Every recognition name that failed to match — the future curation queue.
create table if not exists public.food_match_misses (
  id               uuid primary key default gen_random_uuid(),
  original_name    text not null,
  normalized_name  text not null,
  confidence       numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  occurrences      integer not null default 1 check (occurrences >= 1),
  resolved_food_id uuid references public.foods(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Indexes (designed for 50,000+ foods; all lookups are single-key) ─────────
create index if not exists idx_foods_cuisine        on public.foods (cuisine);
create index if not exists idx_foods_kind           on public.foods (kind);
create index if not exists idx_foods_status         on public.foods (status);
create index if not exists idx_foods_merged_into    on public.foods (merged_into_id);

create index if not exists idx_food_aliases_norm    on public.food_aliases (normalized_key);
create index if not exists idx_food_aliases_food    on public.food_aliases (food_id);

create index if not exists idx_food_nutrition_food  on public.food_nutrition (food_id);
create index if not exists idx_food_nutrition_src   on public.food_nutrition (source_id);
-- Only one "current" nutrition row per (food, basis).
create unique index if not exists uq_food_nutrition_current
  on public.food_nutrition (food_id, basis) where is_current;

create index if not exists idx_match_misses_norm    on public.food_match_misses (normalized_name);
create index if not exists idx_match_misses_food    on public.food_match_misses (resolved_food_id);

-- ── updated_at trigger (foods + food_match_misses) ──────────────────────────
create or replace function public.tg_food_library_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_foods_updated_at on public.foods;
create trigger trg_foods_updated_at
  before update on public.foods
  for each row execute function public.tg_food_library_touch_updated_at();

drop trigger if exists trg_match_misses_updated_at on public.food_match_misses;
create trigger trg_match_misses_updated_at
  before update on public.food_match_misses
  for each row execute function public.tg_food_library_touch_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Reference data (foods/aliases/nutrition/sources) is readable by any signed-in
-- user, mirroring food_portions. No write policies — writes will go through
-- SECURITY DEFINER functions in a later sprint. The curation queue is admin-only.
alter table public.food_sources      enable row level security;
alter table public.foods             enable row level security;
alter table public.food_aliases      enable row level security;
alter table public.food_nutrition    enable row level security;
alter table public.food_match_misses enable row level security;

create policy food_sources_select_all   on public.food_sources   for select to authenticated using (true);
create policy foods_select_all          on public.foods          for select to authenticated using (true);
create policy food_aliases_select_all   on public.food_aliases   for select to authenticated using (true);
create policy food_nutrition_select_all on public.food_nutrition for select to authenticated using (true);
create policy food_match_misses_select_admin
  on public.food_match_misses for select to authenticated
  using (public.current_role() = 'admin');

-- ── Seed: food_sources ONLY (no food rows) ──────────────────────────────────
insert into public.food_sources (code, name, priority, license, website, is_active) values
  ('manual',    'MISU Manual (curated)',      90, 'Proprietary — MISU curated',                 null,                                   true),
  ('myfcd',     'Malaysian Food Composition Database (MyFCD)', 100, '© MOH Malaysia — permission required', 'https://myfcd.moh.gov.my/', false),
  ('fatsecret', 'FatSecret Platform API',      70, 'FatSecret Platform API license',             'https://platform.fatsecret.com/',      false),
  ('usda',      'USDA FoodData Central',        60, 'CC0 1.0 (public domain)',                    'https://fdc.nal.usda.gov/',            false),
  ('off',       'Open Food Facts',              50, 'ODbL 1.0 (share-alike)',                     'https://world.openfoodfacts.org/',     false)
on conflict (code) do nothing;
