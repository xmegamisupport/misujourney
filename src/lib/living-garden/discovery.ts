/** ── Living Garden — Discovery Engine ───────────────────────────────────────
 *
 * The generic "IF condition satisfied → unlock" layer. It answers ONE question,
 * for any asset the same way: given the customer's progress, is this thing
 * unlocked yet? There is no per-object logic — a tree, a rabbit, a pond and a
 * butterfly all pass through the same evaluator.
 *
 * Today the only condition is a Journey-day threshold, which is all Chapter 1
 * needs. The shape is deliberately open so future conditions (tasks completed,
 * a streak, an achievement) become new members of `UnlockCondition` and new
 * fields on `GardenProgress` — with the evaluator and the renderer untouched.
 * Those are NOT implemented now; only the seam for them exists.
 */

/** Everything the discovery engine may look at to decide an unlock. Extend this
 * as new signals are wired in (e.g. `tasksDone`, `streak`, `achievements`). */
export interface GardenProgress {
  /** The customer's current Journey day within the chapter (1-based). */
  day: number;
}

/** A single unlock rule. A union so new rule types slot in without touching
 * existing ones. */
export type UnlockCondition = { type: "day"; day: number };

/** Is this condition satisfied by the given progress? Pure and total. */
export function isUnlocked(condition: UnlockCondition, progress: GardenProgress): boolean {
  switch (condition.type) {
    case "day":
      return progress.day >= condition.day;
    // Future: case "tasks": return (progress.tasksDone ?? 0) >= condition.count;
    //         case "streak": return (progress.streak ?? 0) >= condition.days;
  }
}
