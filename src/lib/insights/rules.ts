import { FLAG_LABELS, FLAG_SEVERITY } from "./constants";
import type { CustomerTrendSummary, FlagSeverity } from "./types";

export interface GeneratedFlag {
  flagType: string;
  label: string;
  severity: FlagSeverity;
}

/** Fixed rules, not free AI judgment ("不要完全依赖AI自由判断") — every
 * threshold here matches the spec's rule table exactly. Always evaluated
 * against a 7-day summary, independent of whichever period (7 or 14 days)
 * the AI insight itself was generated for. */
export function generateAttentionFlags(summary: CustomerTrendSummary): GeneratedFlag[] {
  const flags: GeneratedFlag[] = [];
  const push = (flagType: string) => flags.push({ flagType, label: FLAG_LABELS[flagType], severity: FLAG_SEVERITY[flagType] });

  if (summary.bowelMovement.longestZeroStreak >= 5) {
    push("no_bowel_movement_needs_attention");
  } else if (summary.bowelMovement.longestZeroStreak >= 3) {
    push("no_bowel_movement_3d");
  }

  if (summary.specialConditions.gathering >= 3) push("frequent_gathering");
  if (summary.specialConditions.eating_out >= 4) push("frequent_eating_out");
  if (summary.specialConditions.late_night >= 3) push("frequent_late_night");
  if (summary.specialConditions.stress >= 3) push("high_stress");
  if (summary.specialConditions.sick >= 1) push("recent_sick");
  if (summary.specialConditions.period >= 1) push("menstruation");

  const checkinRate = summary.period.days > 0 ? summary.weight.validEntries / summary.period.days : 0;
  if (checkinRate < 0.5) push("low_checkin_completion");

  if (summary.bowelMovement.loggedDays < 3 || summary.weight.validEntries < 3) push("insufficient_data");

  return flags;
}
