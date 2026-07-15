import { CONSISTENCY_THRESHOLDS } from "./workspace-config";
import type { ConsistencyAssessment, ParticipationSignal, SupportPriority } from "./workspace-types";

function toUtc(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getTime();
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((toUtc(toDate) - toUtc(fromDate)) / 86400000);
}

/** Product-INDEPENDENT consistency engine. It knows nothing about MISU — it
 * only sees generic ParticipationSignals (activity dates) and a Journey Day.
 * Detects two momentum risks, per the approved MVP thresholds:
 *   1. A long gap since any meaningful participation.
 *   2. Declining participation (recent window vs the previous window).
 * Never assumes a fixed product dosage. Not evaluated before the configured
 * starting Journey Day, so brand-new customers are never flagged. */
export function assessConsistency(
  signals: ParticipationSignal[],
  journeyDay: number,
  today: string,
  thresholds = CONSISTENCY_THRESHOLDS
): ConsistencyAssessment {
  if (journeyDay < thresholds.startFromJourneyDay) {
    return { evaluated: false, level: "steady", daysSinceLastActivity: null, tier: null, humanMessage: null };
  }

  const activityDays = new Set<string>();
  for (const signal of signals) {
    for (const d of signal.activityDates) activityDays.add(d);
  }
  const allDays = [...activityDays].filter((d) => d <= today).sort();

  const win = thresholds.declineWindowDays;

  // ----- Gap: consecutive days with no participation up to today -----
  const lastActivity = allDays.length > 0 ? allDays[allDays.length - 1] : null;
  const daysSinceLastActivity = lastActivity ? daysBetween(lastActivity, today) : journeyDay;

  let gapTier: SupportPriority | null = null;
  if (daysSinceLastActivity >= thresholds.gapUrgentDays) gapTier = "urgent";
  else if (daysSinceLastActivity >= thresholds.gapAttentionDays) gapTier = "attention";

  // ----- Decline: recent window vs previous window -----
  const recentCount = allDays.filter((d) => daysBetween(d, today) >= 0 && daysBetween(d, today) < win).length;
  const priorCount = allDays.filter((d) => daysBetween(d, today) >= win && daysBetween(d, today) < win * 2).length;

  let declineTier: SupportPriority | null = null;
  if (priorCount > 0) {
    const ratio = recentCount / priorCount;
    if (ratio <= thresholds.declineUrgentRatio) declineTier = "urgent";
    else if (ratio <= thresholds.declineAttentionRatio) declineTier = "attention";
  }

  const worst = worstTier(gapTier, declineTier);
  if (!worst) {
    return { evaluated: true, level: "steady", daysSinceLastActivity, tier: null, humanMessage: null };
  }

  const parts: string[] = [];
  if (gapTier) parts.push(`已经 ${daysSinceLastActivity} 天没有参与 Journey`);
  if (declineTier) parts.push("最近的参与明显低于之前");
  const humanMessage = parts.join("，") + "。";

  return {
    evaluated: true,
    level: worst === "urgent" ? "declining" : "slowing",
    daysSinceLastActivity,
    tier: worst,
    humanMessage,
  };
}

function worstTier(a: SupportPriority | null, b: SupportPriority | null): SupportPriority | null {
  const rank = (t: SupportPriority | null) => (t === "urgent" ? 0 : t === "attention" ? 1 : t === "reminder" ? 2 : 3);
  const worst = rank(a) <= rank(b) ? a : b;
  return worst;
}
