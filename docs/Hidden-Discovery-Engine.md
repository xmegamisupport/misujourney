# Hidden Discovery — Engine (Phase 3)

> **Status:** Implemented
> **Last updated:** 2026-07-24
> **Governed by:** [`Hidden-Discovery-Design-Bible.md`](./Hidden-Discovery-Design-Bible.md)
> **Registry (source of truth):** [`config/hidden-discovery-registry.json`](../config/hidden-discovery-registry.json)

The engine turns a **user event** into **idempotent discovery unlocks + a celebration
queue**, driven entirely by the Registry. No individual discovery (今天领先, 突破5kg, Journey 30…)
is named in evaluation logic — adding one is a Registry entry on an existing trigger type.

---

## 1. Architecture

```
event ─▶ evaluateHiddenDiscoveries()                     [src/lib/discovery/engine/index.ts]
          │  1. validate event                            (server-only)
          │  2. pick RELEVANT enabled discoveries         events.mts
          │  3. get_hidden_discovery_snapshot()  ◀── DB   dataAccess.ts → SQL (DEFINER, read)
          │  4. evaluate each (pure)                       evaluators.mts / streak.mts
          │  5. record_hidden_discovery_unlocks() ─▶ DB   dataAccess.ts → SQL (DEFINER, write)
          ▼                                                    │ idempotent insert + queue
        EngineResult { newUnlocks, alreadyUnlocked, … }        ▼
                                                        user_discoveries + discovery_celebration_queue
```

**Single source of truth.** The engine reads trigger **conditions** from the Registry **JSON**
(bundled server-side). The DB `discovery_achievements` catalogue is a *projection* of the same
Registry (synced by migration) used by the clue/reveal layer. Conditions are never sent to the
browser.

**Module layout** (`src/lib/discovery/engine/`):

| Module | Purity | Role |
|---|---|---|
| `types.mts` | pure | Shared types. |
| `streak.mts` | pure | Calendar/streak/weekday/comeback/boundary helpers. |
| `evaluators.mts` | pure | One evaluator per trigger type. **The reusable trigger evaluator.** |
| `events.mts` | pure | Event registry + event→discovery relevance. |
| `registry.mts` | pure | Parse/normalize the Registry JSON + static support audit. |
| `queue.mts` | pure | Celebration priority + ordering (mirrors the SQL). |
| `dataAccess.ts` | I/O | The only Supabase surface (two RPCs). |
| `index.ts` | I/O | Server-only orchestrator + public contract. |

> **Server-only.** `index.ts` reads Registry conditions; never import it into a client
> component. Invoke it from an API route / server action / event producer (Phase 4 wiring).

**Public interface**

```ts
evaluateHiddenDiscoveries({
  supabase,              // authenticated SupabaseClient<Database>
  eventType,             // one of EVENT.*
  eventPayload?,         // optional raw payload
  occurredAt?,           // defaults to now
  snapshot?,             // optional pre-fetched snapshot (batching/tests)
}): Promise<EngineResult>
```

`EngineResult = { event, evaluatedDiscoveryIds, newUnlocks, alreadyUnlocked, unsupported, errors }`.
The engine never throws; failures land in `errors`. Presentation is deliberately separate —
the engine returns *what* unlocked, not *how* to show it.

---

## 2. Supported event types

`src/lib/discovery/engine/events.mts` → `EVENT`. Each maps to the signals / trigger types it
can satisfy (`EVENT_RELEVANCE`), so a weigh-in never re-checks food discoveries.

| Event | Evaluates |
|---|---|
| `MORNING_WEIGHT_RECORDED` | weigh-in count/streak/first/time-of-day, `weight_delta`, `goal_achievement` |
| `WATER_TARGET_COMPLETED` / `WATER_PROGRESS_UPDATED` | water count/streak/first |
| `MEAL_RECORDED` / `DAILY_FOOD_COMPLETED` | meal + balanced-meal count/streak/first |
| `DAILY_REFLECTION_COMPLETED` | reflection count/streak/first |
| `DAILY_CHECK_IN_COMPLETED` | daily-completion first/streak/weekday, `comeback` |
| `JOURNEY_COMPLETED` | `journey_completion` |
| `PERSONAL_GOAL_ACHIEVED` | `goal_achievement` |
| `WEIGHT_MILESTONE_REACHED` | `weight_delta` |
| `JOURNEY_STARTED` | `custom` (unsupported today) |
| `HABIT_COMPLETED` | (nothing wired yet) |

Unknown event → `errors: ["unknown_event:…"]`, no writes.

---

## 3. Supported trigger types

`src/lib/discovery/engine/evaluators.mts`. All configurable via the Registry `trigger`.

| Trigger | Condition | Met when |
|---|---|---|
| `first_time` | `{source}` | signal count ≥ 1 |
| `consecutive_days` | `{source, days}` | longest consecutive run ≥ days |
| `accumulated_count` | `{source, count}` | unique qualifying days ≥ count |
| `calendar_condition` | `{source, weekday?｜before?/after?｜on?, count?}` | qualifying occurrences ≥ count |
| `weight_delta` | `{kg}` | `baselineKg − currentKg ≥ kg` |
| `goal_achievement` | `{goal:"phase_N"}` | at stage N **and** current ≤ stage target |
| `journey_completion` | `{which}` | journey length == which(30/60/90) **and** completed |
| `comeback` | `{minGapDays, returnDays}` | an inactivity gap ≥ minGapDays **then** ≥ returnDays consecutive days |
| `custom` | `{rule, params}` | never — reported unsupported (escape hatch) |

The Registry's `custom` rules `weight_loss_reached` / `return_after_gap` are normalized to
`weight_delta` / `comeback` at parse time (`registry.mts`).

---

## 4. Unlock scopes

`discovery_achievements.unlock_scope` (all current discoveries are `lifetime`):

| Scope | Meaning | Uniqueness key |
|---|---|---|
| `lifetime` | once ever | `(user, achievement)` |
| `per_journey` | once per journey | `(user, achievement, journey_id)` |
| `per_stage` | once per stage | `(user, achievement, stage)` |
| `repeatable` | intentionally many | not enforced (reserved; unused) |

Enforced by the expression index `ux_user_discoveries_scope` on
`(user_id, achievement_id, coalesce(journey_id, …), coalesce(stage, -1))`. To ship the first
`per_journey`/`per_stage` discovery, set its `unlock_scope` and have the producer pass
`journey_id`/`stage`; the index already keys on them.

---

## 5. Queue behaviour

Every **new** unlock is inserted into `discovery_celebration_queue`
(`status='pending'`, `priority`) by the same DEFINER call — never a popup fired from the
backend. A future UI drains the queue.

- **Statuses:** `pending → ready → displayed → acknowledged` (or `expired`).
- **Priority** (higher shows first): `rarityRank×100000 − discovery_priority`, i.e. rarity
  dominates (Legendary > Epic > Rare > Common), ties broken by the discovery's own priority,
  then unlock time. Computed identically in SQL and in `queue.mts` so they never diverge.
- Multiple simultaneous unlocks are all stored + queued as a group; ordering/spacing is a
  presentation decision left to the UI. One queue row per unlock (`unique(discovery_unlock_id)`).

---

## 6. Trigger evidence

Each unlock stores `trigger_evidence` (jsonb) for support/debugging/a future Inspector — the
evaluator's `evidence` plus `event` and `occurredAt`. Examples:

```jsonc
// weight_delta
{ "baselineKg": 80, "currentKg": 74, "lostKg": 6, "thresholdKg": 5, "event": "MORNING_WEIGHT_RECORDED", "occurredAt": "…" }
// calendar_condition (early-bird)
{ "before": "07:00", "after": null, "qualifying": 1, "need": 1, "event": "MORNING_WEIGHT_RECORDED", "occurredAt": "…" }
// comeback
{ "minGapDays": 7, "returnDays": 3, "gapDays": 12, "returnStreak": 3, "event": "DAILY_CHECK_IN_COMPLETED", "occurredAt": "…" }
```

No PII is stored — only counts, dates, weights already in the user's own records.

---

## 7. Idempotency & concurrency

Guaranteed at the **database**, never by an app-level check-then-insert:

- `ux_user_discoveries_scope` unique index + `on conflict do nothing` in
  `record_hidden_discovery_unlocks` ⇒ a re-processed event (or two concurrent saves) creates
  **exactly one** unlock row.
- `unique(discovery_unlock_id)` on the queue ⇒ exactly one queue row per unlock.
- The whole record step runs in one function body (one transaction).
- The engine reports discoveries that met-but-weren't-inserted as `alreadyUnlocked` (it infers
  this from the RPC returning only genuinely-new rows — no extra read).

---

## 8. Date & timezone rules

- The app writes daily records on the **04:00 journey boundary** (`customer_journey_date()`),
  so stored dates (`checkin_date`, `log_date`, `earned_on`, `checkout_date`) are already local
  journey dates. The engine consumes these directly — streak math is plain calendar arithmetic.
- Meal dates are derived on the same boundary inside the snapshot RPC
  (`(created_at at time zone tz) − interval '4 hours'`).
- Time-of-day rules (e.g. before 07:00) use the local time the snapshot computes per record.
- `streak.mts:applyDayBoundary()` makes the 04:00 rule explicit/testable for any raw instant.

---

## 9. How to add a new Registry Discovery

1. Add an entry to `config/hidden-discovery-registry.json` (pass the Design Bible §9.1 gate).
2. Use an **existing** trigger type. If it needs a brand-new trigger type, add an evaluator in
   `evaluators.mts` (+ a unit test) and register the type — the **only** code touchpoint.
3. Re-run the registry-sync migration (or the future sync tool) so the DB catalogue matches.
4. If it uses a new signal, extend `get_hidden_discovery_snapshot()` and the `SignalKey` union.

No per-discovery function is ever written. Adding 100 more discoveries on existing trigger
types is 100 data entries.

---

## 10. Known unsupported / inactive Registry items

The engine returns a clear reason; it never fakes support. Current gaps:

| Discovery | Trigger | Why unsupported | To activate |
|---|---|---|---|
| `early-finish` (提前收工) | calendar before-time on water | `daily_water_logs` has no timestamp for *when* the goal was crossed | track goal-completion time |
| `next-chapter-two`, `set-off-again` | `custom` (start_next_chapter / start_new_journey) | no distinct "started a new journey" signal (only `current_stage` increments) | expose a journey-start event |
| `good-chooser`, `after-hundred-meals`, `no-missed-meal`, `hundred-healthy-meals` | meal / meal_balanced | data exists, but **disabled in the Registry**; `meal_balanced` needs a confirmed `misu_score` threshold (scale ambiguous — plate-analysis uses 2–5, some data 0–100) | confirm threshold, then flip `enabled` |
| `today-not-tomorrow` (reflection), `sunday-too` (weekday), `rhythm-returns` (comeback) | first_time / calendar weekday / comeback | evaluators exist; **disabled in the Registry** | flip `enabled` |
| `phase-one/two-complete`, `breakthrough-5/7/10kg`, `journey-30/60/90` | goal_achievement / weight_delta / journey_completion | evaluators exist; **disabled in the Registry** (weight/goal need real journey history; see limitation below) | flip `enabled` after confirming semantics |

**Limitations to confirm before enabling the disabled set**
- `goal_achievement`: `customer_goals` is mutable with no historical snapshot, so a stage goal
  is only confirmable *while the user is at that stage*.
- `weight_delta` baseline = `customer_goals.base_weight_kg` (fallback `profiles.start_weight`),
  current = latest `daily_checkins.weight`. Confirm this is the intended baseline.
- `journey_completion` "completed" = a `daily_complete` reached on the day whose `journey_day`
  ≥ the journey length. Confirm this matches the product's completion rule.

---

## 11. What Phase 3 did **not** do

No UI, no animations, no badge page, no Inspector, no producer wiring, and no change to Habit
logic. Wiring events into the producers (record_morning_checkin, checkout, record_meal, journey
completion) and building the presentation UI are Phase 4.
