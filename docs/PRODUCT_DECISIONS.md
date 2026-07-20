# MISU Product Decision Log

The product's memory. Every significant decision lands here.

**Categories — never mix them:**
- **KNOW** — evidence in hand
- **BELIEVE** — strong reasoning, unverified
- **ASSUME** — no evidence yet
- **DECIDED** — an actual decision

**Decision types:** `BUILD` · `VALIDATE` · `DEFER` · `REJECT` · `FIX`
(`FIX` = something is simply broken or missing. No hypotheses needed — act.)

Every entry carries the sample it was based on. Evidence from n=3 in July is not evidence in
October; entries past their review date are **BELIEVE** until re-confirmed.

---

## 2026-07-19 · Journey Points are derived from a ledger, never incremented

**Observation** — V1 needs a points system. The obvious implementation is a counter on `profiles`.

**Evidence** — **KNOW** every point value in the system is a guess; we have no customer
behaviour data. **KNOW** retries and double-submits happen.

**Decision — `BUILD`** (shipped) Append-only `journey_point_events` with
`unique (customer_id, event_key)`; values in `journey_point_values`; one
`refresh_journey_rewards()` recomputes everything from real table state.

**Reason** — A counter cannot be re-tuned without splitting customers into two eras, cannot
be audited, and needs application code to defend it against double-payment forever. The
ledger gets idempotency from a database constraint, re-scoring from a re-run, and is also
the per-customer per-day instrumentation we have been missing all along.

**Owner** Claude · **Priority** — · **Review** 2026-09-01

---

## 2026-07-19 · Consistency is a window, not a streak

**Observation** — Founder's spec asked for streak bonuses under the heading "reward
consistency instead of perfection".

**Evidence** — **BELIEVE** streaks work through loss aversion, which is the lever MISU
deliberately does not pull. **KNOW** MISU's voice says "出差几天不会让 Journey 中断".

**Decision — `BUILD`** (shipped) "5 of the last 7 days", "10 of 14", "21 of 30", "42 of 60",
each paid once. Founder's values kept unchanged.

**Reason** — The heading and the mechanic contradicted each other: a chain rewards only
perfection, and a 60-day chain punishes one sick day by 1500 points. A window can never
reset to zero, so a missed day costs a day. Founder chose the window.

**Owner** Founder · **Priority** — · **Review** 2026-09-01

---

## 2026-07-19 · Points ranked by (hard to fake × data value)

**Observation** — Founder required that random clicks not be rewarded, but the proposed
values paid 20 for a water goal (four taps) and 25 for a meal (photo + AI + confirm).

**Evidence** — **KNOW** the water total is a client-side upsert with one-tap presets.
**KNOW** `analyze-meal` returns empty arrays for a photo with no food in it.

**Decision — `BUILD`** (shipped) meal 30 · weigh-in 20 · reflection 20 · water 15 ·
learning 10 · all-five bonus 30 (125/day). A meal pays only if the stored record contains at
least one recognised item — checked server-side, from what was stored.

**Reason** — Paying most for the easiest action teaches customers that tapping beats
recording. Body records pay 200 and are gated to the existing 14-day checkpoint; without
that gate four photos a day would out-earn the entire Journey.

**Owner** Founder · **Priority** — · **Review** 2026-09-01

---

## 2026-07-19 · Serious fraud defence waits for redemption

**Observation** — A determined customer can photograph someone else's meal, or re-upload an
old photo, and be paid.

**Evidence** — **KNOW** V1 points buy nothing: no levels, badges, redemption or leaderboard.

**Decision — `DEFER`** Image hashing / EXIF / coach review are not built.

**Reason** — Nobody commits fraud for a number that is not spendable. Building the defence
now solves a problem we have not yet created. **Trigger, not a date: this must be redesigned
BEFORE points become redeemable in any form** — after that, historical data is already
polluted.

**Owner** Founder · **Priority** High · **Review** when redemption enters development

---

## 2026-07-19 · MISU moves into the weight card, and gains a tone

**Observation** — ❤️ MISU 想告诉你 sat at the bottom of the Dashboard, read only by
customers who scrolled. Its purpose is to interpret today's weight.

**Evidence** — **KNOW** it was below four other blocks on mobile. **BELIEVE** the reading
order *see the number → understand the number → act* is more natural. **ASSUME** customers
read the interpretation at all.

**Decision — `BUILD`** (shipped) Message renders inside the weight card, replacing the static
"每一天的累积…" line. Prominence by tier (0 = plain line, 1–2 = highlighted block) and now
also by **tone**: rose = support, emerald = celebration.

**Reason** — Prominence alone could not carry the founder's decision that positive moments
deserve emphasis too: the only highlight available was the rose box used to calm someone
after a bad weigh-in, and praise delivered in that box reads as consolation. Colour is read
before words.

**Owner** Claude · **Priority** — · **Review** 2026-09-01

---

## 2026-07-19 · Only gains above 0.5kg are treated as events

**Observation** — Any increase, including 0.2kg, triggered a full reassurance message.

**Evidence** — **KNOW** day-to-day water swing is routinely 0.3–0.5kg. **BELIEVE**
dramatising noise teaches fear of the scale — the opposite of the product's purpose.

**Decision — `BUILD`** (shipped) Gains ≤0.5kg drop to a quiet tier-0 line; above 0.5kg keeps
the highlight. Same threshold applied to `effort_but_weight_up`.

**Reason** — A companion that treats every wobble as a crisis manufactures the anxiety it
exists to relieve.

**Owner** Founder · **Priority** — · **Review** 2026-09-01

---

## 2026-07-19 · Milestones detected by crossing, not by memory

**Observation** — 第一次低于起点 and 第一阶段达成 must be said exactly once, but there is no
message log (deferred to V1.1).

**Evidence** — **KNOW** the last two weigh-ins are already on the Dashboard.

**Decision — `BUILD`** (shipped) Both fire on the *crossing* between the two most recent
weigh-ins. The condition stops being true by itself, so "once" needs no memory. They
outrank anxiety triggers — a recurring message must not silently consume a once-only one.

**Reason** — Buys the two highest-value milestones now for near-zero cost. Known limit: cannot
fire on a customer's very first weigh-in, and the trick generalises only to weight triggers.
The message log is still required for the reflective family.

**Owner** Claude · **Priority** — · **Review** 2026-09-01

---

## 2026-07-19 · No streak mechanic

**Observation** — A 7-day streak trigger was proposed for MISU.

**Evidence** — **BELIEVE** streaks work through loss aversion. **ASSUME** the effect on
these customers specifically — never tested here.

**Decision — `DEFER`** Not in V1. Revisit once real usage data exists.

**Reason** — A streak says "you broke something" on the day she misses; MISU's entire voice
says "生活本来就会有这样的日子". It is also the same error as "Day 26/30" — packaging
non-absence as achievement, then punishing absence. Preferred replacement is cumulative
**days active**, which never resets, and which depends on the days-active FIX already logged.
Claude argued against it; founder chose to keep the option open pending data rather than
reject outright.

**Owner** Founder · **Priority** Medium · **Review** at first unsupervised cohort

---

## 2026-07-19 · Sample validity of first "customer data"

**Observation** — All recorded activity from the three non-test accounts (Yee, Tina, Starry)
occurred on 2026-07-16 between 19:21 and 19:59. Zero weigh-ins. Nothing recorded since.

**Evidence (KNOW)** — 12 activity rows, all within a 38-minute window, three customers
simultaneously. Weigh-in window is 04:00–12:00, so weighing was impossible at 19:21.

**Decision — `REJECT`** the earlier reading that MISU has a weigh-in or retention problem.

**Reason** — Timing indicates a group demo/onboarding session, not organic use. Invalid
sample. Per OS Step 2, no hypotheses may be generated from it. **We have no customer
behaviour data at all** — not bad data, none.

**Owner** Claude · **Priority** High · **Review** n/a (closed)

---

## 2026-07-19 · Accounts are indistinguishable in the database

**Observation** — Demo, test and real accounts cannot be told apart when querying.

**Evidence (KNOW)** — Caused a real analytical error above; test-account weigh-ins were
initially counted as customer behaviour.

**Decision — `FIX`** Add an account type/flag and exclude non-real accounts from every metric.

**Reason** — Cheap, permanent, and prevents an entire class of false conclusion. Any
instrumentation built before this would inherit the same flaw.

**Owner** Dev · **Priority** High · **Review** 2026-07-26

---

## 2026-07-19 · Learning content exhausted at Day 3

**Observation** — `cms_journey_schedule` contains Day 1 and Day 2 only.

**Evidence (KNOW)** — Schedule query. Sample-independent — a fact about our operation, not
about customers.

**Decision — `FIX`** Schedule further days now; start the editorial pipeline in parallel.

**Reason** — Any customer reaching Day 3 finds no lesson, and 今日学习 is 1 of 5 daily tasks.
Content has the longest lead time of anything on the roadmap; it cannot start when it bites.

**Owner** Founder / CMS team · **Priority** High · **Review** 2026-07-26

---

## 2026-07-19 · Journey & Chapter Spine

**Observation** — The framework defines lifelong Journey + bounded Chapters. Nothing in the
data model expresses it; Journey Day is calendar-elapsed time.

**Evidence** — **BELIEVE** it unblocks Chapter Close, Return, and Maintenance.
**ASSUME** customers understand or value chapters, and that chapter completion aids retention.

**Decision — `DEFER`** until the first unsupervised cohort produces signal.

**Reason** — Architectural dependency is an argument about *sequencing given a decision to
build*, not about value. Retrofit cost is real but its knee is ~200–500 customers, not 50.
Deadline to revisit: before 200 customers.

**Owner** Claude · **Priority** Medium · **Review** 2026-08-16

---

## 2026-07-19 · "Day 26 / 30" shown to a customer who participated 5 days

**Observation** — Journey Day is `journey_date − start_date + 1`; elapsed time is presented
as achievement.

**Evidence (KNOW)** — Verified in `customer_current_journey_day`.

**Decision — `FIX`** Show **days active** as the achievement; keep calendar day as quiet
context. Independent of the Chapter Spine.

**Reason** — Violates "every number must survive *what did the customer do to cause this?*"
Actively punishes absence. Was previously bundled into the Chapter Spine — wrongly, it is an
afternoon's work on its own.

**Owner** Dev · **Priority** High · **Review** 2026-07-26

---

## 2026-07-20 · Weigh-in open all day; the morning is rewarded, not required

**Observation** — Weight could supposedly only be recorded before noon. Founder reached the
form at 17:30 via the back button on 晨重历史 and recorded a weight normally.

**Evidence (KNOW)** — The window was **never enforced anywhere**. `/customer/checkin` has no
clock logic and `record_morning_checkin` only checks the date. The Dashboard hid the entry
point; every other route walked past it. The rule's real effect was zero.

**Decision — `BUILD`** (shipped) Open the whole Journey Day. Points tier by hour instead:
before 10:00 → 20, 10:00–12:00 → 10, after → 0 **but the task still completes** and still
counts toward the 完成今天的 Journey bonus. 跳过 available all day. Shown as an invitation
("10 点前完成 +20"), never as a countdown.

**Reason** — Supersedes the VALIDATE from 2026-07-19: the founder decided rather than waiting
for a cohort, and the discovery that the rule was fictional made waiting pointless. Morning
weighing has a real rationale (most consistent right after waking), so reward it — the old
rule punished a late riser with nothing at all. Risk accepted and named: a decaying reward on
stepping on a scale pulls against everything else this week did to lower scale anxiety.
Mitigated by wording only; revisit if customers report morning pressure.

**Owner** Founder · **Priority** — · **Review** 2026-09-01

---

## 2026-07-19 · Automated safety system (rapid loss / disordered eating)

**Observation** — Stress test scenario 4: a customer losing weight dangerously fast scores as
maximally successful on every metric.

**Evidence** — **BELIEVE** the risk is real. **KNOW** healthy-range goal rules already exist.

**Decision — `DEFER`** to ~50 customers. The human coach is the safety system until then.

**Reason** — Explicit decision, not an oversight. At current scale the coach sees everyone;
automated flags add little and cost much.

**Owner** Founder · **Priority** Medium · **Review** at 50 customers

---

## 2026-07-19 · Stage One completion = nearest edge of the goal band

**Observation** — Goal is a range (e.g. 63–65kg). 100% could mean either edge.

**Evidence** — **BELIEVE**, from goal-gradient effect and internal consistency.

**Decision — `BUILD`** (shipped) 100% at the nearest edge (65), then offer the next stage.

**Reason** — Registration told the customer 63–65 is a healthy success. Showing 60% on
reaching 65 contradicts our own advice and breaks trust. Momentum is better served by a short
completed stage plus a next one than by one long grind.

**Owner** Claude · **Priority** — · **Review** 2026-09-01

---

## 2026-07-19 · Goal card shows progress made, not distance remaining

**Observation** — Card previously read "距离目标 3~5kg" on every open.

**Evidence** — **BELIEVE**, behavioural reasoning. Not yet validated with customers.

**Decision — `BUILD`** (shipped) "第一阶段 72% 完成" + bar + encouragement. Clamped 0–100.

**Reason** — Same arithmetic, opposite feeling. Reinforces effort made rather than distance
left. Never shows a negative after a heavier day.

**Owner** Claude · **Priority** — · **Review** 2026-09-01

---

## 2026-07-19 · Emotional systems (Return, Plateau, Chapter Close)

**Observation** — Stress test flagged all three as critical gaps.

**Evidence** — **BELIEVE** they matter. **ASSUME** the built versions change behaviour.

**Decision — `VALIDATE`** manually via the coach over WhatsApp before building anything.

**Reason** — MISU has a human coach in the loop — a validation advantage most products lack.
If the manual version doesn't change behaviour, the built version won't either, and we learn
it for the price of a message.

**Owner** Coach · **Priority** High · **Review** 2026-08-09
