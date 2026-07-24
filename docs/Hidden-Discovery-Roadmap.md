# Hidden Discovery — Roadmap

> **Status:** Living plan
> **Last updated:** 2026-07-24
> **Governed by:** [`Hidden-Discovery-Design-Bible.md`](./Hidden-Discovery-Design-Bible.md)
> **Registry:** [`config/hidden-discovery-registry.json`](../config/hidden-discovery-registry.json)

This roadmap paces *how* the Hidden Discovery framework grows. It does not define discovery
content — content is authored into the registry under the Bible's authoring gate (§9.1).

**Guiding rule:** growth is **data**, not code. The only work that touches code is a
**new trigger type** or a **new celebration style**. Everything else — new discoveries, new
categories, new params — is a registry change.

---

## V1 — Foundation *(current phase)*

**Goal:** lock the framework so content can be added safely and forever after.

**In scope**
- ✅ Design Bible — philosophy, principles, Habit-vs-Discovery boundary, schema, guardrails.
- ✅ Registry scaffold — categories, trigger types, celebration types, rarities, schema, empty `discoveries[]`.
- ✅ Roadmap (this document).
- ✅ Engine capabilities already live and mapped to the canonical vocabulary:
  `first_time`, `accumulated_count` (cumulative), `consecutive_days` (streak),
  `calendar_condition` (specific date + time-of-day).
- ✅ Reveal-drip (one at a time), evolving clues/hints, per-user clue assignment,
  server-only conditions.

**Authorable in V1** (once content work begins): **Early**, **Habit**, and **Calendar**
moments — because their trigger types (`first_time`, `consecutive_days`,
`accumulated_count`, `calendar_condition`) are already live.

**Exit criteria:** a small, honest starter set of discoveries can be authored purely as
registry data, passing the §9.1 gate, with no code change.

---

## V2 — Depth

**Goal:** unlock the moment-families that need new engine capability, and make authoring
first-class.

**New trigger types (the code work)**
- `journey_completion` — celebrate finishing a journey / chapter → unlocks **Milestone**-style completion moments.
- `goal_achievement` — celebrate reaching a user-set goal → unlocks the **Achievement** category properly.
- Comeback detection (gap-aware) → unlocks the **Comeback** category (returning after a pause).

**New categories enabled** (data, once their triggers exist): **Achievement**, **Milestone**
(at scale), **Comeback**.

**Celebration variety**
- Distinct reveal tone per category (`gentle` / `milestone` / `calendar` / `comeback`),
  so a milestone doesn't feel like an everyday first.

**Authoring & operations**
- **Registry → runtime sync tool** — resolve the §10 open decision: generate the runtime
  seed from `config/hidden-discovery-registry.json` so there is exactly one source of truth.
- Registry validation (schema + Bible gate checks) in CI.
- Privacy-safe, aggregate-only signal on which moments land emotionally (no per-user
  tracking of "who hasn't earned what").

**Exit criteria:** all six V1 categories are authorable; the runtime is provably derived
from the registry.

---

## Future — Expansion

Directional, not committed. Pulled forward as the framework proves itself.

- **`custom` trigger DSL** — a small, safe rule expression layer so novel moments can be
  prototyped without a bespoke engine change each time; proven rules graduate to first-class
  trigger types.
- **Seasonal & event discoveries** — calendar campaigns (new year, anniversaries) authored
  as time-boxed registry entries with `enabled` windows.
- **Personalized clue pacing** — adapt `hintAdvanceDays` to each user's rhythm.
- **Localization** — `name` / `description` / `hints` translatable per locale.
- **Opt-in sharing** — let a user share *a discovered moment* (never their raw stats), with
  privacy as the default.
- **Coach-visible moments** — if and only if privacy allows, let a coach celebrate a
  moment *with* the user (a "together" reveal), governed by explicit consent.
- **New moment families** — e.g. *Seasonal Moment*, *Together Moment* — added as categories
  once their triggers exist.

---

## What is explicitly NOT on the roadmap

Per the Design Bible, these are permanent non-goals, not "later":

- ❌ A visible checklist / quest log of discoverable moments.
- ❌ Exposing unlock conditions or the hint catalogue to the client.
- ❌ Rarity as a population percentage or any fabricated social proof.
- ❌ Leaderboards, XP bars, or any competitive / game-like framing.
- ❌ Any "missed / expired" state that shames the user.
- ❌ Overlap with the Habit system (double-counting the same growth).

---

## Change log

| Date | Version | Change |
|---|---|---|
| 2026-07-24 | 1.0.0 | Framework established: Design Bible + registry scaffold + roadmap. `discoveries[]` intentionally empty. |
| 2026-07-24 | 1.1.0 | First official Discovery collection: 23 discoveries across Early / Water / Food / Reflection / Calendar / Achievement / Milestone. Added `epic` rarity, `surprise`/`proud`/`celebration` celebration types, `water`/`food`/`reflection` categories, planned signals (`meal`/`meal_balanced`/`reflection`), and the `futureNotes` field. 5 are live now; 18 ship as `enabled:false` specs awaiting their trigger/signal. No engine or UI changes. |
