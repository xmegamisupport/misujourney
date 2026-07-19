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

## 2026-07-19 · Weigh-in window 04:00–12:00

**Observation** — Weight can only be recorded before noon. Outside it, the only action is 跳过.

**Evidence** — **KNOW** the constraint exists. **ASSUME** its impact; never observed on real
customers.

**Decision — `VALIDATE`** Ask the first unsupervised cohort directly; decide before scaling.

**Reason** — Morning-only has a genuine rationale (measurement consistency), but it makes
weight impossible for anyone who wakes late or opens the app at night. A decision to make
deliberately, not a bug to fix reflexively.

**Owner** Founder + Coach · **Priority** High · **Review** 2026-08-02

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
