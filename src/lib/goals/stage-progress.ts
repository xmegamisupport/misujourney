/** Stage-one progress, expressed as "how far you've come" rather than "how far
 * is left".
 *
 * MISU is a transformation companion, not a weight tracker: opening the app to
 * "还有 3~5kg" every day reinforces the distance remaining, while "72% 完成"
 * reinforces the effort already made. Same arithmetic, opposite feeling — and
 * the encouraging one is the product decision.
 *
 * Pure and deterministic so the number and the message can be reasoned about
 * and unit tested without a DB or a browser.
 */

export interface StageProgress {
  /** 0-100, clamped — never negative after a heavier day, never over 100. */
  percent: number;
  reached: boolean;
  /** Short encouragement matched to how far along the customer is. */
  message: string;
}

function stageMessage(percent: number): string {
  if (percent >= 100) return "你已经完成第一阶段目标，为自己骄傲一下。";
  if (percent >= 75) return "继续保持，你已经越来越接近第一阶段目标。";
  if (percent >= 50) return "已经走过一半，你做得很好。";
  if (percent >= 25) return "节奏已经稳定下来了，继续保持。";
  if (percent > 0) return "改变已经开始，保持下去就好。";
  return "每一天的累积，都会成为你的改变。";
}

/** @param startWeightKg     the weight this stage's goal was set from
 *  @param currentWeightKg   the latest recorded weight
 *  @param stageGoalWeightKg the nearest edge of the stage goal range — reaching
 *                           it means the customer has entered their goal band
 *  Returns null when there's nothing to chart (no loss goal for this stage). */
export function calculateStageProgress(startWeightKg: number, currentWeightKg: number, stageGoalWeightKg: number): StageProgress | null {
  const total = startWeightKg - stageGoalWeightKg;
  if (!(total > 0)) return null;

  const achieved = startWeightKg - currentWeightKg;
  const percent = Math.max(0, Math.min(100, Math.round((achieved / total) * 100)));
  return { percent, reached: percent >= 100, message: stageMessage(percent) };
}
