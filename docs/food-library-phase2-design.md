# MISU Journey · Food Library — Phase 2 Architecture Proposal

> Design only. No SQL, no migrations, no code. For review before implementation.

## Core idea (one sentence)

Introduce a **canonical food model** — every real-world food is ONE `foods` row;
every name/language points to it via `food_aliases`; nutrition is **versioned +
multi-source** in `food_nutrition` tagged by `food_sources`; barcodes and
packaged goods are the SAME foods specialised by a `food_barcodes` join. The
existing `food_portions` stays as the **generic fallback**, and `meals` keep a
**frozen nutrition snapshot** so history never changes. Everything is additive —
the app is never worse than today, even before the library has data.

---

## 1. Database structure (table list + why)

| Table | Exists? | Purpose / why it must exist |
|---|---|---|
| **foods** | NEW | The canonical concept — one row per distinct food (Nasi Lemak, Chicken Rice, a specific packaged snack). Everything hangs off this. Prevents duplicates and gives one stable id to link meals to. |
| **food_aliases** | NEW | Many names → one food. "海南鸡饭 / Hainan Chicken Rice / 鸡饭 / Nasi Ayam" all resolve here. Holds a `normalized_key` for matching + `lang` + `source`. This is what makes AI-name matching work. |
| **food_nutrition** | NEW | Versioned, multi-source nutrition per food (per-100g and/or per-serving). Many rows per food (one per source/version); `raw_payload` keeps the original. Never overwritten — new data = new row. |
| **food_sources** | NEW | Provenance + trust registry (manual, usda, off, myfcd, fatsecret, packaged_label). Carries `license`, `priority` (which source wins), `url`. Drives conflict resolution + legal auditability. |
| **food_barcodes** | NEW | GTIN/EAN/UPC → food. A food can have several barcodes (variants). Keeps packaged goods on the SAME canonical pipeline. |
| **food_components** | NEW (optional/future) | Composite dish → sub-foods with weights (Nasi Lemak = rice + fried chicken + peanuts + cucumber). Lets a dish inherit nutrition + a real 211 breakdown. Can be deferred. |
| **food_match_misses** | NEW | Every AI name that failed to match, logged for curation. This is how the library GROWS from real usage. |
| **food_portions** | EXISTS | Unchanged. Becomes the **generic fallback** layer (15 categories) when no named food matches. |
| **meals** | EXISTS (evolve) | Keep the denormalised macro snapshot (immutable history). ADD nullable `food_id` + `nutrition_id` links per item for analytics/backfill. |
| **packaged_foods** | EXISTS (retire) | Its crowd-sourced label rows migrate into `foods`(kind=packaged) + `food_nutrition`(packaged_label) + `food_barcodes`. |

---

## 2. Relationships (ERD, text)

```
food_sources ──1───∞── food_nutrition ──∞───1── foods ──1───∞── food_aliases
                                                  │  ▲
                          foods.primary_nutrition_id ┘  │ (chosen "current" row)
                                                  │
                          foods ──1───∞── food_barcodes
                          foods ──1───∞── food_components ──∞───1── foods (child)
                          foods ──1───∞── food_match_misses (resolved_food_id, nullable)

food_portions        (standalone generic fallback catalog — 15 categories)

meals(meal items jsonb)
   ├── snapshot: calories/protein/carb/fat/fiber   (FROZEN, never recomputed)
   ├── food_id        → foods.id        (nullable link)
   └── nutrition_id   → food_nutrition  (nullable — which row was used)
```

**Full resolution flow the user asked for:**
```
AI returns "Nasi Lemak"
      ↓ normalize → "nasilemak"
food_aliases.normalized_key  (match)
      ↓
foods  (canonical: Nasi Lemak, id=…)
      ↓  primary_nutrition_id / source-priority pick
food_nutrition  (per-serving values, source=manual/myfcd, version N)
      ↓  scale by chosen portion
meals  (stores FROZEN macros + food_id + nutrition_id)
```

---

## 3. Canonical food strategy (avoid duplicates)

**One canonical `foods` row; every spelling/language/dialect is an alias.**

```
foods #123  "Chicken Rice"  (cuisine=malaysian, kind=dish)
  ← alias "Chicken Rice"      (en)
  ← alias "Hainan Chicken Rice"(en)
  ← alias "海南鸡饭"           (zh)
  ← alias "鸡饭"               (zh)
  ← alias "Nasi Ayam"          (ms)
```
Best practice to keep it clean:
- **`normalized_key`** on every alias: lowercase, trim, strip spaces/punctuation
  (and optionally romanise zh→pinyin) → matching is deterministic and dialect-proof.
- **Match is alias-first (exact on normalized_key)**; fuzzy/semantic (pg_trgm or
  embeddings) only *suggests* — a NEW canonical is created only on human confirm,
  never auto-merged (a wrong auto-merge poisons a health product).
- **Merge, don't delete**: duplicates get `status='merged'` + `merged_into_id`, so
  old links still resolve. A tiny admin "merge/curate" tool handles this.
- **Ambiguity guard**: the same word can be two dishes (e.g. regional). Aliases
  carry `cuisine`/context so a curator can split rather than force-merge.

---

## 4. Nutrition source strategy (source · version · history)

Store nutrition as **append-only rows**, one per (food × source × version):

```
food_nutrition
  food_id, source_id, basis(per_100g|per_serving), serving_g,
  calories, protein, carb, fat, fiber, (+sodium/sugar… extensible),
  version, is_current, valid_from, raw_payload(jsonb), created_at
```
- **source**: FK → `food_sources` (manual / usda / off / myfcd / fatsecret / packaged_label).
- **version + history**: never overwrite. New data → new row, `version+1`, flip
  `is_current`. Full audit trail for free; you can always see what a value was on a date.
- **Which value wins**: `food_sources.priority` (e.g. MyFCD > manual > OFF > AI-estimate),
  with an optional per-food override via `foods.primary_nutrition_id`. So MyFCD (once
  licensed) can outrank a manual seed automatically.
- **Legal**: `food_sources.license` records CC0 (USDA) / ODbL-share-alike (OFF) /
  permission-required (MyFCD) — provenance is queryable for compliance.

---

## 5. Barcode strategy

**Same `foods` table, specialised — NOT a separate parallel food table.**
- A packaged product = `foods` row with `kind='packaged'` (+ brand), its label
  nutrition in `food_nutrition` (source=packaged_label / off), and its GTIN(s) in
  `food_barcodes(barcode UNIQUE → food_id)`.

| Option | Pros | Cons |
|---|---|---|
| **Unified (foods + food_barcodes)** ✅ | One nutrition pipeline, one dedup, one recognition path; a barcode and a photo can resolve to the *same* food | Slightly more join logic |
| Separate `packaged_foods` table | Isolated, simple | Duplicates nutrition/versioning logic, splits recognition, two places to dedup |

Recommend **unified**. Migrate today's `packaged_foods` into it. `food_barcodes`
is just the lookup index onto the shared canonical model.

---

## 6. AI recognition flow (proposed pipeline)

```
Input (photo | barcode | label photo)
        │
        ├─ barcode ─────────────→ food_barcodes → foods ─┐
        │                                                │
        ├─ label photo ─ OCR ───→ food_nutrition(label) ─┤ (create/find food)
        │                                                │
        └─ meal photo ─ AI Vision → {name, category}     │
                          │ normalize name               │
                          ▼                               │
                 food_aliases.normalized_key ── hit ──→ foods ─┤
                          │ miss                                │
                          ▼                                     ▼
                 log to food_match_misses            food_nutrition (source-priority, is_current)
                          │                                     │
                          ▼                                     ▼  scale by portion
                 FALLBACK: food_portions (generic category)  →  meal totals
                                                               │
                                                               ▼
                                              meals (FROZEN snapshot + food_id + nutrition_id)
```
AI keeps doing ONLY name+category (its safe job). The library upgrades the *lookup*
after recognition — the vision model still never invents numbers.

---

## 7. Fallback strategy

Never block a meal. Strict ladder, best → safest:
```
1. Barcode match            → exact packaged nutrition
2. Named-dish alias match   → canonical food_nutrition (source-priority)
3. Nutrition-label OCR      → transcribed per-100g (packaged)
4. Generic category         → food_portions (TODAY's behaviour) + user portion
5. Manual add               → user names it; queued to food_match_misses
```
If 1–3 miss, we land on **4 = exactly what the app does now**, so shipping the
library can only add accuracy, never remove function. Every miss is logged →
curators turn frequent misses into new canonical foods → the library self-improves.

---

## 8. Scalability (50 → 50,000 foods)

Postgres handles this trivially with the right indexes — 50k foods / a few hundred
k aliases is *small*:
- `food_aliases.normalized_key` → **btree** (exact match, O(log n)).
- `food_barcodes.barcode` → **unique btree**.
- fuzzy suggestions → **pg_trgm GIN** (or **pgvector** embeddings only if/when you
  want semantic match at large scale).
- `food_nutrition` partial index on `is_current`.

Reads are single-key lookups, independent of table size. The model is the same at
50 and 50,000 rows — you add data, not schema. (Realistic ceiling is millions, far
beyond need.)

---

## 9. Migration strategy (don't break existing meals)

Additive + non-destructive, in this order:
1. **Create new tables** alongside the old ones. Nothing existing changes yet.
2. **`meals` keep their frozen macros** — never recomputed. Add *nullable*
   `food_id`/`nutrition_id`; old rows simply have them null. No historical meal
   ever changes its recorded nutrition.
3. **Seed `food_sources`** (manual, off, usda, myfcd, fatsecret, packaged_label)
   and a **curated Malaysian dish set** via source=manual.
4. **Recognition reads library-first, falls back to `food_portions`** — so behaviour
   is identical wherever the library is empty. Zero-risk rollout.
5. **Migrate `packaged_foods`** → foods/food_nutrition/food_barcodes; keep the old
   table read-compatible during transition, then retire.
6. **Optional backfill**: best-effort match old meal item names to new aliases to
   populate `food_id` for analytics — non-destructive, snapshots untouched.

---

## Risks

| Risk | Mitigation |
|---|---|
| **Wrong auto-merge** (two dishes collapsed) | Never auto-create/merge canonicals; alias-exact match only, fuzzy is suggestion + human confirm |
| **False-positive match** (worse than a miss in a health app) | Prefer fallback over a low-confidence match; require confidence/curation for new aliases |
| **Nutrition conflicts across sources** | `food_sources.priority` + `is_current` + per-food override; keep all versions |
| **Legal/licensing** | MyFCD needs written permission; OFF is ODbL share-alike; USDA CC0. `food_sources.license` makes provenance auditable — don't ingest MyFCD before approval |
| **Crowd/AI data quality** | packaged_label + AI rows are low-priority sources; curators promote verified data |
| **Meal immutability vs library updates** | meals store a frozen snapshot; library changes never alter past records |
| **Curation workload** | `food_match_misses` ranks by frequency so effort targets the highest-impact foods first |

---

## Recommendation (phased)

- **Phase 2a (build now):** `foods` + `food_aliases` + `food_nutrition` +
  `food_sources` + `food_match_misses`. Seed 30–50 curated Malaysian dishes
  (source=manual). Recognition = alias-match → else `food_portions` fallback.
  `meals` gain nullable `food_id`. **Biggest local-accuracy gain, lowest risk.**
- **Phase 2b:** `food_barcodes`; migrate `packaged_foods`; wire Open Food Facts
  barcode lookup (free, ODbL — mind share-alike).
- **Phase 2c:** external sources behind `food_sources` — USDA (CC0) backbone,
  FatSecret (MY data), and **MyFCD only after MOH/IMR permission**; add
  `food_components` for composite-dish nutrition + true 211 breakdown.

This model supports all 12 requirements **without a second redesign**: new cuisines
are just rows; new data sources are just a `food_sources` entry + `food_nutrition`
rows; barcode/OFF/MyFCD/FatSecret all plug into the same canonical foods.
