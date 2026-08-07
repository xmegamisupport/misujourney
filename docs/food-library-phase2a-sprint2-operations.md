# Food Library · Phase 2A Sprint 2 — Operations Foundation

> Builds on the Sprint 1 core tables (foods · food_aliases · food_sources ·
> food_nutrition · food_match_misses). Goal: a maintenance system the food team
> can run for 5k–50k foods without developers.

## ✅ Finalized Governance Model (approved, with adjustments)

**Roles (decoupled from a person's app role via a `food_staff` grant table, so
staff can be anyone — not only nutrition specialists):**
- **Food Editor** — create drafts, add aliases, edit tags/names/images. Low-risk, editor-only, audited.
- **Food Reviewer** — everything an Editor can do **plus approve** high-risk changes.
- **Food Admin** — everything, plus manage sources and grant/revoke staff. (An app `admin` is automatically a Food Admin.)

**Risk-based approval — only these require a Reviewer's approval:**
`publish a food (draft→active)` · `nutrition value change goes live` · `merge foods` ·
`archive/retire food` · `change primary nutrition source`.
Everything else (aliases, spelling, tags, images, creating an invisible **draft**)
is Editor-only + audit log. Creating a food is free while it stays a **draft**
(invisible to customers); only **publishing** it is gated.

**Recognition Inbox** — `food_match_misses` is the operational queue, statuses:
`new → reviewing → published | ignored`, each item auto-scored by a **priority
score** (occurrences · recency · confidence · whether a similar food already
exists) so the highest-value missing foods surface first.

**Every change** is written only through role-gated SECURITY DEFINER RPCs (direct
table writes stay closed), recorded in `food_audit_log` (actor · action ·
before/after · when), with **optimistic locking** (edits carry `updated_at`; a
stale edit is rejected) and **claim locks** on inbox items so 10 people never
collide. Nothing customers saw ever changes — meals keep frozen snapshots.

---

---

## Part 1 — Unified Food Import Specification

**One canonical JSON record = one food + its aliases + one nutrition row (+ optional barcode/metadata).**
CSV/Excel are *flat projections* of this record; every external source (MyFCD /
USDA / OFF / FatSecret / AI) maps *into* it. JSON is the source of truth; the
importer converts CSV→JSON before validating.

### Canonical record (JSON)

| Field | Type | Req | Description | Example |
|---|---|---|---|---|
| `import_key` | string | optional | Stable idempotency key = `source:external_id`. Re-importing updates the same food instead of duplicating. | `"myfcd:0421"` |
| `canonical_name` | string | **req** | Primary display name. Auto-added as a `canonical` alias. | `"Nasi Lemak"` |
| `cuisine` | enum | **req** | malaysian/chinese/western/japanese/fast_food/beverage/dessert/packaged/generic/other | `"malaysian"` |
| `kind` | enum | **req** | dish/ingredient/packaged/branded | `"dish"` |
| `brand` | string | optional | For packaged/branded only | `"Maggi"` |
| `plate_category` | enum | optional | Maps to an existing `food_portions` category for 211 fallback | `"rice"` |
| `dietary_tags` | string[] | optional | halal / vegetarian / vegan / spicy / … (see Part 5) | `["spicy"]` |
| `status` | enum | optional (default `draft` on import) | active/draft — imports land as `draft` until reviewed | `"draft"` |
| `aliases[]` | array | optional | Extra names. Each: `{ name, language, match_type }` | see below |
| `aliases[].name` | string | **req in item** | Alias text | `"椰浆饭"` |
| `aliases[].language` | enum | optional (default `other`) | en/zh/ms/ja/other | `"zh"` |
| `aliases[].match_type` | enum | optional (default `synonym`) | synonym/romanization/brand/ocr/ai | `"synonym"` |
| `nutrition` | object | optional* | One nutrition row. *Required for a food to leave `draft`. | see below |
| `nutrition.source` | enum(code) | **req in obj** | food_sources.code | `"manual"` |
| `nutrition.basis` | enum | **req in obj** | per_100g / per_serving | `"per_serving"` |
| `nutrition.serving_g` | number | cond | Required when basis=per_serving | `230` |
| `nutrition.serving_name` | string | optional | Human portion label (Part 5) | `"1 plate"` |
| `nutrition.calories` | number | **req in obj** | kcal | `389` |
| `nutrition.protein` | number | **req in obj** | g | `9.1` |
| `nutrition.carbohydrate` | number | **req in obj** | g | `52.4` |
| `nutrition.fat` | number | **req in obj** | g | `16.2` |
| `nutrition.fiber` | number | optional (default 0) | g | `2.0` |
| `nutrition.sodium_mg` | number | optional | mg | `560` |
| `nutrition.sugar_g` | number | optional | g | `3.1` |
| `nutrition.valid_from` | date | optional (default today) | Effective date of the value | `"2026-08-07"` |
| `nutrition.raw_payload` | object | optional | Original source object, kept verbatim for audit | `{...}` |
| `barcodes` | string[] | optional (future) | GTIN/EAN/UPC (Sprint 2b) | `["9556001..."]` |
| `notes` | string | optional | Curator note | `"per printed table 2015"` |

### Flat CSV/Excel projection (one row per food)
Columns: `import_key, canonical_name, cuisine, kind, brand, plate_category,
dietary_tags(|-delimited), aliases(|-delimited), aliases_lang(|-delimited),
source, basis, serving_g, serving_name, calories, protein, carbohydrate, fat,
fiber, sodium_mg, sugar_g, notes`.
- Multi-value cells use `|` (e.g. `aliases = "Nasi Lemak|椰浆饭|Nasi Lemak Biasa"`).
- The importer expands the row into the canonical JSON above, then validates.

### Why this scales
Every source maps to the SAME record: a MyFCD row → `source:"myfcd"`, USDA →
`source:"usda"`, an AI suggestion → `source:"ai"`, all with per_100g/per_serving.
New source = no format change, just a new `food_sources` code.

---

## Part 2 — Food Library CMS Structure (backend responsibilities)

No UI. Each module = a set of role-gated (nutritionist/admin) SECURITY DEFINER
RPCs over specific tables. Proposed modules:

| Module | Owns | Responsibility |
|---|---|---|
| **Food Library** | `foods` | Create/edit/retire a canonical food; **merge** duplicates (status=merged, merged_into_id); set `primary_nutrition_id`. |
| **Aliases** | `food_aliases` | Add/edit/remove names; compute `normalized_key`; detect + block cross-food collisions. |
| **Nutrition** | `food_nutrition` | Add a new **version** (append-only), flip `is_current`, attach source; never overwrite history. |
| **Sources** | `food_sources` | Registry: priority, license, active toggle. Admin-only. |
| **Review Queue** | `food_match_misses` | Triage AI misses → link/create/dismiss (Part 3). |
| **Import** | `import_batches`, `import_rows` (NEW, Sprint 2 impl) | Upload → parse → validate to a **staging** area → commit only clean rows. |
| **Import History / Audit** | `import_batches`, `food_audit_log` (NEW) | Who imported/changed what, when; per-row results; enables review + rollback. |

New operational tables to add in Sprint 2 implementation (not now):
- `import_batches` (id, source, filename, uploaded_by, counts, status).
- `import_rows` (batch_id, row_no, raw jsonb, parsed jsonb, validation status+errors, resulting food_id) — the staging + audit trail.
- `food_audit_log` (actor, action, table, record_id, before/after jsonb, at) — change history for a health dataset.

All writes go through RPCs (RLS keeps direct table writes closed), so the CMS UI
later is thin — it just calls these operations.

---

## Part 3 — Review Queue Workflow (food_match_misses)

Add (Sprint 2 impl) a lifecycle to the existing table: `status`
(new/in_review/resolved/dismissed), `resolution_type`
(linked_existing/created_new/dismissed), `resolved_by`, `resolved_at`
(resolved_food_id already exists).

```
AI recognition returns a name it can't match
        ↓  upsert by normalized_name (occurrences++, keep first confidence)
food_match_misses  (status=new, ranked by occurrences desc)
        ↓  admin opens the queue (highest-frequency first — Pareto)
Admin Review — three outcomes:
  (a) It IS an existing food, just a new name
        → add alias to that food  → status=resolved(linked_existing)
  (b) It's a NEW food
        → create food + canonical alias + nutrition (draft→active)
        → status=resolved(created_new); resolved_food_id set
  (c) Junk / not food / illegible
        → status=dismissed
        ↓
Alias now exists → next time the SAME name is recognized it MATCHES
        ↓
No new miss logged → the library self-heals from real usage
```
Key rules: misses **aggregate** by `normalized_name` (one row, occurrences count)
so effort targets the most-logged unknowns; resolving never edits history, it
just creates aliases/foods; dismissed misses are kept (not deleted) so the same
junk doesn't reopen endlessly.

---

## Part 4 — Seed Strategy (no imports yet — priorities only)

**Principle: frequency-first (Pareto), Malaysian-first, manual source first.**
A small set of everyday dishes covers the majority of real meal logs.

| Phase | Size | What | Why |
|---|---|---|---|
| **Phase 1** | 30–50 | The everyday staples — Nasi Lemak, Chicken Rice, Char Kuey Teow, Roti Canai, Mee/Nasi Goreng, Wan Tan Mee, Bak Kut Teh, Teh Tarik, Kopi O, Milo, Kaya Toast… | ~50 dishes cover most Malaysian meal logging; highest accuracy gain per row |
| **Phase 2** | ~200 | Common MY + Chinese/Malay/Indian mains, popular drinks, kopitiam desserts, mamak + fast food | Broadens coverage to the "second tier" of frequent foods |
| **Phase 3** | 1,000+ | Long tail, regional, packaged/branded, ingredients | Completeness; largely **data-driven from `food_match_misses`** once AI is live |

- **Nutrition basis**: dishes → `per_serving` with a realistic `serving_g` +
  `serving_name`; ingredients → `per_100g`.
- **Source order**: `manual` (curated, attributed to published MyFCD/printed
  tables) now → external sources later (MyFCD only after MOH permission).
- **After AI is wired (Sprint 3+)**: let `food_match_misses` frequency *tell* the
  team which foods to add next — stop guessing, seed what users actually eat.

---

## Part 5 — Metadata Recommendation (now vs later — keep clean)

Current schema already has: `cuisine`, `kind`, `brand`, `plate_category`
(on foods) and `serving_g` (on food_nutrition).

**Add NOW (2 fields — high value, cheap, hard to backfill):**
| Field | Where | Why now |
|---|---|---|
| `dietary_tags text[]` | foods | ONE extensible field covers **halal / vegetarian / vegan / spicy** and more — culturally essential in Malaysia (halal especially). Beats 5 separate booleans. |
| `serving_name text` | food_nutrition | Pairs with `serving_g` for a human label ("1 plate / 一碗"); needed for clear portions. |

**Wait (LATER / fold into existing — avoid over-engineering):**
| Field | Verdict |
|---|---|
| `meal_type` | LATER — nice for suggestions, not needed to record a meal; can be a tag later |
| `image_url` / `image` | LATER (Phase 3) — storage + curation overhead; not needed for nutrition |
| `beverage_type` | SKIP — already expressed by `cuisine=beverage` + `kind` + tags |
| `health_goal` | SKIP for now — speculative; belongs to a recommender, not the food row |
| separate `halal/vegetarian/vegan/spicy` booleans | SKIP — collapsed into `dietary_tags` |
| `serving_unit` | SKIP — `basis` (per_100g/per_serving) + `serving_g`/`serving_name` already cover it |

Net: **+2 fields now**, everything else deferred or folded. Schema stays lean.

---

## Part 6 — Import Validation (reject before it enters the library)

Two-stage: **parse → validate into staging (`import_rows`) → commit only clean
rows.** Nothing is half-written; bad rows stay in staging with reasons for fixing
+ re-run. Each row gets a verdict: `ok` / `warning` / `error`.

| Check | Rule | On failure |
|---|---|---|
| **Structural** | Required fields present; types/enums valid; macros ≥ 0; `serving_g > 0` | `error` — reject row |
| **Invalid serving** | `basis=per_serving` but `serving_g` missing/≤0 | `error` — reject |
| **Missing nutrition** | No nutrition, or all macros 0 | `warning` — allow as `draft` food, flag for curator |
| **Duplicate (idempotent)** | `import_key` already imported | update existing (not a dup) |
| **Duplicate (name)** | `normalized_key` already maps to an existing food | `warning` — route to **merge review**, never silent insert |
| **Alias conflict** | A `normalized_key` already belongs to a **different** food | `error` — reject/route to review (never silently reassign) |
| **Nutrition outlier** | calories/100g > ~900; any macro > 100 g/100g; `4·P + 4·C + 9·F` vs calories off by > ~20% | `warning` — flag as outlier for human check |
| **Duplicate barcode** (future) | GTIN already mapped to another food | `error` — reject/route to review |

Reject behavior: the batch produces a **per-row report** (ok/warn/error +
messages); **commit inserts only `ok` (and curator-approved `warning`) rows**;
`error` rows never touch the live tables. Re-import after fixes is idempotent via
`import_key`.

---

## Part 7 — Risks

| Risk | Mitigation |
|---|---|
| Curator error (wrong merge / wrong alias) | Merge is reversible-ish (status+merged_into, keep history); audit log records before/after; new canonical only on explicit action |
| Import data quality | Staging + validation report; commit only clean rows; imports land as `draft` |
| Alias collisions across cuisines (same word, two dishes) | Conflict check blocks cross-food reassignment; curator splits, not force-merges |
| Nutrition inconsistency across sources | Outlier + macro-vs-calorie check; `food_sources.priority` decides current; all versions kept |
| Over-seeding before telemetry | Phase 1 minimal; let `food_match_misses` drive Phase 2/3 after AI is on |
| Curation workload at 50k | Queue ranked by frequency; import in batches; roles delegate to nutrition team |
| License compliance on imported data | `food_sources.license` per row; **do not import MyFCD before MOH permission**; respect OFF ODbL share-alike |
| Everything bypassing RLS | All writes via role-gated SECURITY DEFINER RPCs; direct table writes stay closed |

---

## Part 8 — Recommendations

1. **Implement (Sprint 2 build, after approval), in order:**
   a. Schema additions only: `foods.dietary_tags`, `food_nutrition.serving_name`,
      `food_match_misses` lifecycle columns, and `import_batches` / `import_rows`
      / `food_audit_log`. (All additive.)
   b. **Validation + import RPCs** (parse → validate → stage → commit) — the heart
      of this sprint.
   c. **Review-queue RPCs** (triage/link/create/dismiss).
   d. Role gating to `nutritionist` + `admin` (reuse existing CMS roles).
2. **CMS UI is a later, thin layer** over these RPCs — not this sprint.
3. **Seed nothing yet**; when tooling is ready, do Phase 1 (30–50) manually,
   attributed to published sources.
4. **Add only the 2 metadata fields now**; keep the schema lean.
5. **Let the Review Queue become the seeding engine** once AI is wired (Sprint 3+):
   the misses tell you exactly what to add.

**Stop here — await approval before Sprint 3 (AI recognition wiring).**
