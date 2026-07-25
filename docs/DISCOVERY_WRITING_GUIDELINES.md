# Hidden Discovery — Writing Guidelines

> **Status:** Standard (binding for all Discovery copy)
> **Last updated:** 2026-07-25
> **Governed by:** [`Hidden-Discovery-Design-Bible.md`](./Hidden-Discovery-Design-Bible.md) · Product Constitution (Phase 5)
> **Applies to:** every Discovery's `name` and `description` (the recognition message) — existing, enabled, disabled, and all future ones.

Every Discovery is a **letter of recognition**. Not a report. Not an achievement description.
Not a system notification. This document exists so the whole Collection sounds like it was
written by one warm, attentive person — never "some cards feel like a congratulation letter,
others like release notes."

**Write for this moment, two years from now:**

> *If the user opens this card again in two years, will they still feel proud — or will it read
> like an old system record?*

If proud → the writing is right. If it reads like documentation → rewrite it.

---

## 1. The seven rules

1. **Recognize the person, not the action.**
   Celebrate *who they've become*, not *what they did*. The trigger is invisible to the user;
   the copy must never re-expose it.
   - ✅ 「好好喝水，你把它坚持成了不间断的习惯。这份稳定，是很多人做不到的温柔。」
   - ❌ 「连续七天喝够水。」 / 「你完成了 7 次晨间称重。」

2. **No mechanics, no numbers, no counts.**
   Never say "7 days", "100th", "5 kg", "streak", "goal", "before 7am". Those describe the
   *rule*; recognition describes the *meaning*. (The one honest exception: a milestone whose
   scale *is* the emotion may name the round number poetically — 「一百个清晨」— but must still
   pivot immediately to the person.)

3. **Second person, present and warm.** Speak to 「你」. Never "the user", never third person,
   never a system voice.

4. **Short. One breath.** 1–3 sentences. A card is felt, not read. If it needs a paragraph,
   it's explaining — cut it.

5. **No rarity, no ranking, no comparison-to-shame.** Never "rare", "epic", "top X%", "better
   than others". Warmth may say "很多人渴望却难得" (recognizing difficulty) but never "你比别人强".

6. **Honest.** No fabricated statistics or social proof. If we don't have the number, we don't
   imply it. (See the Design Bible's honesty guardrail.)

7. **Emotionally durable.** It must still land in a year. Avoid anything time-stamped, trendy,
   or that reads as "an old achievement". A discovery is a permanent part of the person.

---

## 2. Tone Library — every Discovery has its own voice

The mistake to avoid: **every card starting with "恭喜你…"**. Recognition is not one tone. Each
Discovery should carry a personality that fits *its* moment. Author each card by choosing a
tone deliberately — variety across the Collection is the goal.

| Tone | Feels like | Fits moments about… | Example register |
|---|---|---|---|
| **Warm** (温暖) | a close friend noticing | everyday care, hydration, small kindnesses to oneself | 「你一次次选择善待自己的身体，久而久之，温柔成了本能。」 |
| **Moved** (感动) | quiet pride, almost tears | perseverance, showing up when it was hard | 「无数个清晨，你都愿意诚实地面对自己。这份坦诚与勇气，本身就了不起。」 |
| **Gentle humor** (幽默) | a friend teasing kindly | light, playful moments; comebacks | 「你又回来了 —— 看吧，节奏从来没真正离开过你。」 |
| **Mentor** (导师) | a teacher who believes in you | milestones, journeys completed, growth | 「你走完了最难的那一段 —— 开始。剩下的路，你已经有了底气。」 |
| **Friend** (朋友) | someone on your side | first steps, encouragement | 「当世界还在沉睡，你已经开始善待自己。」 |

Rules for tone:
- **Pick one primary tone per Discovery** and commit to it. Don't blend three.
- **Vary tones across categories and neighbours** so the Collection doesn't feel monotone.
- Tone is part of a Discovery's identity (alongside its future visual identity) — record the
  intended tone in the Registry `futureNotes` when authoring, so it survives edits.

---

## 3. Structure of a recognition message

A reliable shape (not a rigid template — vary it):

> **[what they quietly did, reframed as character]** —— **[why it matters / who that makes them]**

- Line 1 names the *quality* the moment reveals (steadiness, honesty, courage, gentleness…).
- Line 2 gives it weight — what it says about them, or how rare/human that is.
- The em-dash 「——」 is a useful beat, but don't make all 23 identical. Break the pattern.

---

## 4. Do / Don't

| ❌ Don't (report / system voice) | ✅ Do (recognition) |
|---|---|
| 连续七天喝够水。 | 好好喝水，你把它坚持成了不间断的习惯。这份稳定，是很多人做不到的温柔。 |
| 你完成了第 100 次晨间称重。 | 无数个清晨，你都愿意诚实地面对自己。这份坦诚与勇气，本身就了不起。 |
| 恭喜你解锁「早起鸟」成就！ | 当世界还在沉睡，你已经开始善待自己。早起的人，拥有别人错过的宁静。 |
| 你达成了减重 5kg 目标。 | 五公斤的改变，是你一次次坚持换来的 —— 数字背后，是看不见的努力。 |
| 你今天比别人更早完成任务。 | 你主动迎接了这一天，而不是被它推着走。这份从容，很多人渴望，却难得。 |

---

## 5. Authoring checklist (before adding any Discovery)

- [ ] It reads as a **letter to a person**, not a description of an action.
- [ ] **No** numbers, counts, streaks, thresholds, or rule words.
- [ ] Speaks to 「你」, warm, present tense.
- [ ] 1–3 sentences; felt in one breath.
- [ ] A **deliberate tone** is chosen (§2) and noted in the Registry.
- [ ] No rarity, ranking, or shaming comparison.
- [ ] Honest — no invented statistics.
- [ ] Passes the **two-year test**: still makes the person feel proud, never like an old record.
- [ ] Consistent with the fairness rule (celebrate effort, never body type — Design Bible §2.3).

---

## 6. Status of existing copy

- The **5 live Discoveries** (`today-ahead`, `early-bird`, `watertight`, `hundredth-cup`,
  `hundred-mornings`) have been rewritten to this standard (Registry v1.3.0).
- The **18 disabled Discoveries** keep their earlier copy for now; each must be brought to this
  standard **before it is enabled**. Treat that as part of enabling, not a separate pass.

*One voice. Many tones. Every card written for its one moment.*
