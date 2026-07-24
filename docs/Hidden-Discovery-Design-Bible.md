# Hidden Discovery — Design Bible

> **Status:** Architecture v1 (framework only, no content)
> **Owner:** Product (CPO)
> **Last updated:** 2026-07-24
> **Governs:** `config/hidden-discovery-registry.json`, the Discovery engine, and every future Discovery.
> **Companion docs:** [`Hidden-Discovery-Roadmap.md`](./Hidden-Discovery-Roadmap.md)

This document is the **permanent guideline** for the Hidden Discovery System. Any change to
Discovery product logic must be reconciled against this Bible first. When code and this
document disagree, the disagreement is a bug — fix one of them, deliberately.

---

## 0. What this system is (and is not)

Hidden Discovery is **not a badge collection feature.**

It is a system that **notices and celebrates meaningful, memorable moments** during a real
health journey — and surprises the user with them *after* they happen, not before.

- It is **not** a checklist the user works through.
- It is **not** a to-do list, a quest log, or a completion meter.
- It is **not** a second progress bar competing with habits.

The feeling we are designing for is:

> *"The app noticed something about my journey that even I had forgotten to be proud of."*

Surprise, warmth, and being *seen* — never grinding, never FOMO.

---

## 1. Philosophy

**Moments, not metrics.**
Habits are made of numbers that grow. Discoveries are made of moments worth remembering.
A number is a measurement; a moment is a memory. Hidden Discovery collects memories.

**Discovered, not awarded.**
The user does not "earn" a discovery by chasing it. The system *discovers* it on their
behalf. The exact condition is never shown up front — only after the moment has already
happened do we reveal what it was. This preserves the surprise.

**Celebration, not evaluation.**
A discovery never judges. There is no failure state, no "you missed it," no expiry that
punishes. A moment that hasn't happened yet is simply *still waiting* — quietly, kindly.

**Emotion before information.**
When a discovery is revealed, the first thing the user feels should be an emotion, not a
statistic. Raw counts, percentages, and rankings belong to the Habit system, not here.

**Honesty.**
We never fabricate social proof ("only 3% of users…") when we have no population data to
back it. Rarity is an *emotional weight*, not a probability claim. See §8.

---

## 2. The Two Systems — Habit vs Discovery

MISU Journey has two complementary reward systems. **They must never overlap.**

| | **Habit System** (Healthy Habits / Glowing You) | **Hidden Discovery** |
|---|---|---|
| **Purpose** | Track long-term *growth* | Celebrate memorable *moments* |
| **Shape** | Continuous, always-on | Episodic, one moment at a time |
| **Visibility** | Fully visible, transparent | Hidden until the moment happens |
| **Content** | Quantitative (counts, streaks, levels) | Qualitative (a moment, a feeling) |
| **Driver** | User-driven — the user watches it grow | System-driven — the system surprises the user |
| **Emotional job** | *Pride in progress* ("I'm building this") | *Delight in being seen* ("it noticed!") |
| **Failure** | Progress can stall (and resume) | No failure — moments simply wait |

### 2.1 The Non-Overlap Rule (the boundary test)

Before any signal becomes a Discovery, it must pass this test:

1. **Is it a number the user actively watches grow?** → It belongs to **Habits**. Not a Discovery.
2. **Is it a moment the user would smile to be *reminded* of?** → It may be a **Discovery**.
3. **Would showing it as a live progress bar ruin the surprise?** → Then it must be a Discovery, hidden.

If a candidate fits *both* systems, it belongs to **Habits** by default, and Discovery may
only celebrate a *distinct, moment-shaped slice* of it (e.g. Habits track "days hydrated";
Discovery celebrates *"the first time you ever hit your water goal"* — a moment, once).

### 2.2 Worked boundary examples (conceptual — not seeded content)

| Signal | Habit owns | Discovery may celebrate |
|---|---|---|
| Drinking enough water | "Days you hit your water goal" (ongoing count) | *The very first time* it happened (a first-moment) |
| Daily check-ins | "Check-in streak" (live streak) | *Coming back* after a long pause (a comeback-moment) |
| Learning content | "Lessons completed" (count) | *Finishing on a meaningful date* (a calendar-moment) |

The rule of thumb: **Habits count. Discovery remembers.**

### 2.3 Effort, not body type (the fairness rule)

A Discovery may celebrate **what a user *did*** — never **what a user *is*.** This is a
permanent fairness rule: every future decision about whether something can become a Discovery
must pass it.

**❌ Rewarding body type is NOT allowed.** A Discovery must never unlock from a natural body
condition or a starting advantage — something the user did not earn through effort:

- BMI landing in the "normal" range
- Being naturally thin to begin with
- Having a high (or low) starting weight
- Any state that reflects a user's given body rather than their effort

Rewarding these would congratulate genetics and quietly shame everyone whose body started
somewhere else. We never do it.

**✅ Rewarding meaningful achievement earned through effort IS encouraged.** A Discovery may
celebrate a real accomplishment that took work, regardless of the body it started from:

- Losing 5 kg, 7 kg, or 10 kg *(universal milestones — see below)*
- Completing a personal stage goal the user set
- Completing a Journey (Kickstart 30 / Momentum 60 / Transformation 90)

**Why weight-loss milestones are allowed.** *Losing* 5/7/10 kg is a **universal achievement
discovery**: the same effort-based accomplishment for everyone, measured as a *change the user
produced*, not as their starting body. A person who begins at 120 kg and one who begins at
70 kg each earn "lost 5 kg" through the same effort — the milestone is the **journey they
travelled**, never the body they began with. This is categorically different from rewarding a
low BMI or a naturally slim frame, which no effort produced.

These live under **Achievement Moment → Universal Milestone**. They are framed to celebrate
the persistence behind the change, never the appearance of the result.

> **The test, in one line:** *Could a user with a different natural body, putting in the same
> effort, earn this too?* If **yes**, it may be a Discovery. If it unlocks from the body they
> were simply born with or started at, it must not.

---

## 3. Design Principles

1. **Registry-driven — zero hardcoded discoveries.**
   Every Discovery is data in the registry. Adding one is a data change, never a code change.
   The engine dispatches on *trigger type*; the content is never compiled in.

2. **Surprise over transparency.**
   Never show the exact unlock condition. Clues hint; they never specify. (See §6.4.)

3. **Emotion over information.**
   The reveal leads with a name, an icon, and a warm line — not "8 / 50" or "top 4%".

4. **One at a time (drip).**
   If several moments happen at once, reveal them *spaced out*, one per surfacing, so each
   keeps its weight. Never dump a pile of discoveries.

5. **Honest by construction.**
   No invented statistics, no fake scarcity, no manipulative urgency.

6. **Never punish.**
   No expiry that shames, no "missed" state, no negative framing. Absence is gentle.

7. **Additive & backward compatible.**
   New discoveries, categories, and celebration styles are added by data. Existing user
   history is never invalidated by a new discovery.

8. **Private by construction.**
   Unlock conditions and hint text are **server-only**. The browser can never read the
   catalogue of what's possible or how to trigger it — it only receives what it has earned
   and the evolving clue text for what it hasn't.

9. **Calm & premium, never game-like.**
   No XP bars, no confetti-cannon casino energy, no leaderboards. Soft, warm, quiet pride.

---

## 4. Anatomy of a Discovery (registry schema)

Every Discovery is one object in `config/hidden-discovery-registry.json → discoveries[]`.
The canonical field set:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string (kebab/slug) | ✓ | Stable unique identifier. **Never reused, never renamed.** |
| `name` | string | ✓ | The discovery's title, shown on reveal. Warm, human, evocative. |
| `category` | enum (`categories[]`) | ✓ | Which moment-family it belongs to (§5). |
| `habit` | enum \| `null` | ✓ | The habit domain it *relates* to (water, weighin, learning, …), or `null` if cross-cutting. Used for clue biasing, **not** for tracking. |
| `trigger` | object `{ type, params }` | ✓ | How the moment is detected (§6). `type` ∈ `triggerTypes[]`. |
| `celebrationType` | enum (`celebrationTypes[]`) | ✓ | How the reveal *feels* / which animation tone (§7). |
| `description` | string | ✓ | The warm line shown once discovered. Emotion first, no stats. |
| `icon` | string (emoji/asset ref) | ✓ | The visual token for the moment. |
| `enabled` | boolean | ✓ | If `false`, the discovery exists as a spec but is **never evaluated or assigned** (used for future-data or seasonal moments). |
| `rarity` | enum (`rarities[]`) | ✓ | Emotional weight label — **not** a probability. (§8) |
| `version` | string (semver) | ✓ | The registry version this discovery was introduced/last changed in. |

**Optional / supporting fields** (present in schema, used by the reveal & clue pacing):

| Field | Type | Meaning |
|---|---|---|
| `hints` | array of `{ stage, text }` | The clue text that evolves vague → less vague. Never the exact condition. |
| `hintAdvanceDays` | integer | Per-discovery pacing: days before a clue advances one stage. |
| `priority` | integer | Reveal ordering when several are earned at once (lower = revealed first). |
| `futureNotes` | string | Author / roadmap notes, never shown to users: activation conditions, future variants. |

### 4.1 Field rules

- **`id` is forever.** Renaming or reusing an `id` corrupts every user's earned history.
  To retire a moment, set `enabled: false`; never delete or repurpose the id.
- **`name` / `description` carry the emotion.** No numbers, no "you are the Nth…", no
  comparison to others.
- **`habit: null`** is legitimate — a calendar or comeback moment may not map to one habit.
- **`trigger.params` schema is owned by the trigger type**, not by the discovery (§6).

---

## 5. Categories (moment families)

Categories are **data** (`registry → categories[]`). New categories are added without code;
the engine treats `category` as an opaque label for grouping, clue biasing, and reveal tone.

The V1 canonical set:

| Category key | Name | The moment it celebrates | Emotional tone |
|---|---|---|---|
| `early` | **Early Moment** | First steps — the very first time something happens | Encouragement, "you've begun" |
| `water` | **Water Moment** | The quiet discipline of staying hydrated | Refreshing, light |
| `food` | **Food Moment** | Mindful, consistent eating — not dieting | Nourishing, warm |
| `reflection` | **Reflection Moment** | Showing up for yourself and closing the day well | Grounded, calm |
| `calendar` | **Calendar Moment** | Something meaningful tied to a date, season, or time of day | Warmth, serendipity |
| `achievement` | **Achievement Moment** | A self-set goal, a weight breakthrough, or a Journey reached | Satisfaction, "you did it" |
| `milestone` | **Milestone Moment** | Accumulated scale — a big round total, looking back | Awe at the distance travelled |
| `comeback` | **Comeback Moment** | Returning after a pause, without judgment *(reserved for V2)* | Compassion, "welcome back" |

> **v1.1 note:** the earlier generic `habit` category was split into the more specific
> `water` / `food` / `reflection` moment families as the first content batch landed. `comeback`
> stays defined but empty until the engine supports gap detection (V2); the one comeback-flavoured
> moment authored so far (*节奏回来了*) is filed under `reflection` per this taxonomy.

> Future categories (e.g. *Seasonal Moment*, *Together Moment*) are added by appending to
> `categories[]`. See the Roadmap. **No code change is required to add a category.**

Each category should carry, in the registry: `key`, `name`, `intent`, and `tone`.

---

## 6. Trigger System

A trigger answers one question: *"Did this moment just happen?"* The engine reads the user's
**real** journey data and evaluates each enabled discovery's trigger. All trigger types and
their parameters are configurable via the registry.

### 6.1 Canonical trigger taxonomy

| Trigger type | Detects | Core params (schema) |
|---|---|---|
| `first_time` | The first time a signal ever occurs | `{ source }` |
| `consecutive_days` | N days in a row of a signal | `{ source, days }` |
| `accumulated_count` | A signal reaches N total | `{ source, count }` |
| `journey_completion` | A journey / chapter is completed | `{ scope }` |
| `goal_achievement` | A user-set goal is reached | `{ goal }` |
| `calendar_condition` | A signal under a date / season / time-of-day rule | `{ on?, before?, after?, season? }` |
| `custom` | Escape hatch — a named rule evaluated by the engine | `{ rule, params }` |

`source` refers to a **named journey signal** (water, weigh-in, learning, daily-complete,
product usage, …). The set of valid signals is itself configuration — a Discovery never
reaches into a raw table by name; it references a signal.

### 6.2 The `custom` escape hatch

`custom` exists so that a genuinely new *shape* of moment can be prototyped without inventing
a first-class trigger type immediately. A `custom.rule` names a handler the engine knows how
to run. **Adding a new `custom.rule` is the one case that touches code** — and that is the
signal to consider promoting it to a first-class trigger type (see §7 of the Roadmap).

### 6.3 Mapping to the current engine (reconciliation)

A Discovery engine already runs in production. This Bible's canonical vocabulary maps onto
the engine's existing dispatch keys as follows, so the registry and the running system stay
consistent:

| Bible trigger | Current engine dispatch key | Status |
|---|---|---|
| `first_time` | `first_time` | ✅ live |
| `accumulated_count` | `cumulative_count` | ✅ live (alias) |
| `consecutive_days` | `streak_days` | ✅ live (alias) |
| `calendar_condition` (time-of-day) | `time_of_day` | ✅ live (subset) |
| `calendar_condition` (specific date) | `calendar_date` | ✅ live (subset) |
| `accumulated_count` on a habit threshold | `habit_level` | ✅ live (special case) |
| `journey_completion` | — | 🔜 roadmap (engine work) |
| `goal_achievement` | — | 🔜 roadmap (engine work) |
| `custom` | — | 🔜 roadmap (engine work) |

> **Decision flag:** the registry uses the *canonical* names above as the forward-looking
> source of truth; the seed that populates the runtime maps them to the engine keys. The
> aliases (`accumulated_count`↔`cumulative_count`, `consecutive_days`↔`streak_days`) and the
> `calendar_condition` split are intentional and documented here so nobody "fixes" one side
> into disagreement. Unifying the two vocabularies into one is a deliberate future task, not
> an accident to be silently patched.

### 6.4 Clues & hint evolution (surprise preservation)

A discovery the user hasn't earned yet is represented to them only as a **clue**: a category,
a rarity feel, and an evolving hint. Hints move vague → less vague over time (paced per
`hintAdvanceDays`) but **never state the exact condition**. "Something to do with water."
→ "It rewards patience." → never "Drink your goal 7 days in a row." The exact `trigger` and
`params` are server-only and never sent to the client.

---

## 7. Celebration Types

The *reveal itself* is data-driven. `celebrationType` selects the emotional register of the
unlock moment — pacing, motion, sound (if any), copy tone. It is decoupled from category so a
single reveal style can serve many categories and vice-versa.

Starter set (extensible via `registry → celebrationTypes[]`) — three emotional registers:

| Key | Feel | Typical use |
|---|---|---|
| `surprise` | Delightful, unexpected | First-times, serendipity, calendar moments |
| `proud` | Quiet, warm pride | Consistency, effort, showing up |
| `celebration` | Full, joyful | Milestones, Journeys, breakthroughs |

New celebration types are added as data + a mapping in the reveal component. Adding a *new*
celebration *style* is a small, bounded code touchpoint (the animation); assigning an
*existing* style to a new discovery is pure data.

---

## 8. Rarity — an emotional label, not a statistic

`rarity` communicates *how special this moment feels*, not how many people have it. Starter
set: `common`, `rare`, `epic`, `legendary`.

**Hard rule:** rarity is **never** rendered as a population percentage ("only 2% of users")
unless and until we have real, defensible population data *and* a product decision to show
it. Until then, rarity only tunes visual weight and copy warmth. This is a non-negotiable
honesty guardrail (Principle §3.5).

---

## 9. Expansion Rules — how the system grows

The whole point of this architecture is that **growth is data, not code.**

| To add… | You change… | Code? |
|---|---|---|
| A new Discovery | `discoveries[]` (one object) | ❌ none |
| A new Category | `categories[]` | ❌ none |
| A new Rarity label | `rarities[]` + a style token | ⚠️ tiny (style only) |
| A new Celebration style | `celebrationTypes[]` + one animation | ⚠️ bounded (animation only) |
| New params on an existing trigger | the discovery's `trigger.params` | ❌ none |
| A brand-new **trigger type** | engine dispatch + `triggerTypes[]` | ✅ yes (the main code touchpoint) |

### 9.1 Adding-a-Discovery checklist (author's gate)

Before appending a discovery to the registry, confirm **all**:

- [ ] It is a **moment**, not a metric. (Passes the §2.1 Non-Overlap test.)
- [ ] It rewards **effort, not body type**. (Passes the §2.3 fairness rule — it celebrates what the user *did*, never a natural body condition or starting advantage.)
- [ ] It does **not** duplicate anything the Habit system already tracks.
- [ ] Its `name` and `description` lead with **emotion**, contain **no statistics**.
- [ ] Its `rarity` is honest (no implied population claim).
- [ ] Its `hints` **suggest** without **specifying** the condition.
- [ ] Its `trigger.type` already exists (or a new type has been designed deliberately).
- [ ] `id` is new and permanent; `version` is set.

### 9.2 Versioning discipline

- Bump `$meta.version` (semver) when the registry changes.
- Each discovery records the `version` it was introduced/last changed in.
- Retire via `enabled: false` — **never** delete or reuse an `id`.

---

## 10. Relationship to the runtime

An engine and per-user state already exist (the Discovery engine + user tables). This
registry is the **design-time source of truth / specification** for *what discoveries exist*
and *what they mean*. The runtime catalogue (the seed the engine reads) should be **derived
from this registry**, not authored independently, so there is exactly one place a moment is
defined.

> **Open decision (do not change silently):** whether the runtime should read this JSON
> directly, or continue reading a DB seed generated from it. Both satisfy "no hardcoded
> logic." This Bible does not mandate one; §12 of the Roadmap tracks building the
> registry→runtime sync. Until then, treat the JSON as canonical and keep the seed in step.

---

## 11. Anti-patterns (do not do these)

- ❌ Turning Discovery into a visible checklist or quest log.
- ❌ Exposing unlock conditions or hint catalogues to the client.
- ❌ Overlapping the Habit system (double-counting the same growth).
- ❌ Rewarding body type or a natural advantage (low BMI, naturally thin, starting weight). Effort-based achievements — including losing 5/7/10 kg — are encouraged (§2.3).
- ❌ Fabricated rarity percentages or social proof.
- ❌ Revealing many discoveries at once (dumping).
- ❌ Any "expired / missed" state that shames the user.
- ❌ Hardcoding a discovery's existence or condition in application code.
- ❌ Renaming or reusing an `id`.

---

*This Bible defines the frame. The registry fills it. The roadmap paces it.*
