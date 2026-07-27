# MISU Journey — Product Constitution: Hidden Discovery

> **Status:** Constitution (highest-authority product document for Hidden Discovery)
> **Last updated:** 2026-07-28
> **Companion docs:** [`Hidden-Discovery-Design-Bible.md`](./Hidden-Discovery-Design-Bible.md) (engineering detail) · [`DISCOVERY_WRITING_GUIDELINES.md`](./DISCOVERY_WRITING_GUIDELINES.md) (copy) · [`Hidden-Discovery-Roadmap.md`](./Hidden-Discovery-Roadmap.md)

When any implementation conflicts with this document, **follow the Constitution, not the earlier
implementation.** This is the "why" behind Hidden Discovery.

> **The one sentence:** *Healthy Habits helps users grow. Hidden Discovery helps users realize
> they have already grown.*

---

## Principles

### Principle 1 — Recognition, not achievement
Hidden Discovery is not a badge collection, reward system, or gamification mechanic. It quietly
recognizes meaningful growth the user may not even realize happened. The feeling is always
*"the system noticed something beautiful about me"* — never *"congratulations, another task done."*

### Principle 2 — Two systems, one space *(updated 2026-07-28)*
Healthy Habits = **growth** (levels, XP, progress, daily streaks). Hidden Discovery =
**recognition** (one-time, permanent, no progression). They are different emotional systems, but
they live **together** on Glowing You — the user's complete growth space — with no extra
navigation. Living together is not blending: Habits stay a progress system, Discovery stays a
collection of moments. Never let Discovery inherit Habits' mechanics (levels, XP, completion).

### Principle 3 — A Mystery Discovery, never a spoiler *(updated 2026-07-28, Mystery Mode)*
Undiscovered discoveries appear, but as **mysteries** — never their real face. Showing the icon and
name (an earlier version of this principle) gave the answer away: 🐦 "早起鸟" instantly reads as
"weigh in early." So an undiscovered discovery now shows only:

- a **masked badge** — `❔`
- a **masked name** — `??????`
- **one curiosity hint** — e.g. *"有人总在世界醒来之前，就已经完成了什么。"*

Never the real name, icon, category, unlock condition, progress, rarity, percentage, or remaining
count; never a lock, silhouette, or "coming soon". The server never even sends a mystery's
name/icon/code to the client — the client cannot leak what it never receives.

**Hint rules.** A hint's only job is to make the user *wonder* — never to let them guess. It must
create curiosity ("what could this possibly be?"), never reveal the condition ("oh, that's the water
one"). Each mystery carries several hints; the one shown **rotates daily**, so the same mystery can
feel different on different days. Hints live in the Registry (`mysteryHints`) and follow
[`DISCOVERY_WRITING_GUIDELINES.md`](./DISCOVERY_WRITING_GUIDELINES.md).

**Curiosity Mode.** Show only a small, **daily-rotating** handful (3–5) of mysteries — never the
full set. Both which mysteries show *and* which hint each one shows are deterministic per (user,
day): stable if reopened today, fresh tomorrow. This keeps the total count hidden and makes the
world feel alive: *"I don't remember seeing this one yesterday."* The goal is never to tell users
what they can unlock — it is to make them wonder. Discovery is solving little mysteries along the
journey, not checking off achievements.

### Principle 4 — One-time, permanent, no rank
Every discovery unlocks once, is collected forever, never repeats, never upgrades. No rarity, no
levels, no XP, no ranking. Every discovery carries equal emotional value; its importance comes
from the user's own journey, not a system-defined grade.

### Principle 5 — Real-time reveal, never batched
New discoveries surface in real time — on return to the dashboard, after a brief idle — not on a
nightly or daily schedule. The queue is real-time.

### Principle 6 — Reveal and Collection are separate
The **Reveal** exists to create surprise and emotional recognition: name, celebration, beautiful
animation, Continue — no mechanics, no stats. The **Collection** exists for permanent recognition:
name, recognition message, discover date. Two different experiences.

### Principle 7 — Recognition, not description
Every discovery is a *letter of recognition*, not a report or a system notification. Celebrate the
person, not the action; no counts or mechanics. All copy follows
[`DISCOVERY_WRITING_GUIDELINES.md`](./DISCOVERY_WRITING_GUIDELINES.md). The test: *if the user
reopens this card in two years, will they still feel proud?*

### Principle 8 — A Discovery should feel handcrafted, not generated
Even with 30, 50, or 100 discoveries, each must feel *specially created for this one moment* —
never "another card using the same template". This governs copy, colour, background, light,
animation, and atmosphere alike. Where a choice scales more easily by making everything uniform,
prefer the one that keeps each discovery singular. The future goal: **a user should recognize a
discovery before reading its title** (Early Bird = sunrise, warm orange light; Water = flowing
blue; Knowledge = paper, books, soft reading light). Architecture must stay flexible for this.

### Principle 9 — The Collection is a museum
Hidden Discovery is not a dashboard, achievement list, or badge grid. The Collection should feel
like a **personal museum / memory album / gallery of meaningful moments**. Opening it a year
later, a user should *want* to slowly browse, tap each discovery, reread its message, and remember
their journey. The page encourages reflection, not the display of information. First feeling on
open: *"these are my memories"* — never *"these are database records."*

### Principle 10 — Overview browses; detail remembers *(progressive disclosure)*
The overview (the Glowing You gallery) is for **browsing** — scannable in seconds: each discovery
is only an icon, a name, and a date (if discovered). No recognition paragraph, no celebration
copy, no reading on the overview. The full emotional experience — animation, recognition message,
celebration — lives **one tap deeper**, in each discovery's own moment. The overview is for
finding; the detail is for remembering.

### Principle 11 — A collection, not a checklist
Hidden Discovery is a collection to be curious about, not a checklist to complete. Never frame it
around completion: no "3 / 23", no "18 left", no progress toward "all discoveries". The feeling to
create is *"there are still many meaningful moments waiting for me,"* never *"I have 18
achievements left."* Curiosity, not completion.

### Principle 12 — The core unit is a Moment (Habit → Moment → Discovery) *(added 2026-07-28)*
A Discovery is not the atom of this system — a **Moment** is. The hierarchy is **Habit → Moment →
Discovery**: a *Habit* is the daily behaviour, a *Moment* is a meaningful milestone within it, and a
*Discovery* is the emotional recognition we present for that moment. Every habit holds many moments;
every moment is celebrated by one Discovery. All future content is authored from this model — the
question is always *"what meaningful Moments exist within this Habit?"*, never *"what badge should we
add?"* Beginning from a habit's moments produces a human journey; beginning from badges produces a
checklist. This is the foundation beneath every other principle here. (Design Bible §1.0.)

---

*Can users view their discoveries? — solved. The question now: **will users enjoy coming back to
revisit them?** Every future decision serves that.*
