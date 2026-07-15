import type { JourneyDays } from "@/lib/goals/types";
import type {
  CelebrationPriority,
  CelebrationType,
  JourneyName,
  SupportCategory,
  SupportPriority,
  SupportType,
} from "./workspace-types";

// ---------- Official Journey names (BL-001 direction) ----------

export const JOURNEY_NAMES: Record<JourneyDays, JourneyName> = {
  30: { name: "Kickstart Journey", emoji: "🌱" },
  60: { name: "Momentum Journey", emoji: "🌿" },
  90: { name: "Transformation Journey", emoji: "🌳" },
};

export function journeyNameFor(journeyDays: number | null | undefined): JourneyName {
  if (journeyDays === 30 || journeyDays === 60 || journeyDays === 90) return JOURNEY_NAMES[journeyDays];
  return { name: "Journey", emoji: "🎯" };
}

// ---------- Celebration rules (configurable — MVP starting values) ----------
// visibility: "today" = only the day the milestone is crossed; number = days
// the opportunity stays visible after the crossing date.

export interface CelebrationRule {
  priority: CelebrationPriority;
  visibility: "today" | number;
}

export const CELEBRATION_RULES: Record<CelebrationType, CelebrationRule> = {
  goal_weight_achieved: { priority: "highest", visibility: 7 },
  transformation_complete: { priority: "highest", visibility: 7 },
  momentum_complete: { priority: "high", visibility: 7 },
  kickstart_complete: { priority: "high", visibility: 7 },
  first_body_progress: { priority: "high", visibility: 3 },
  new_lowest_weight: { priority: "medium", visibility: "today" },
  streak_30: { priority: "medium", visibility: "today" },
  streak_7: { priority: "lower", visibility: "today" },
};

export const CELEBRATION_PRIORITY_ORDER: Record<CelebrationPriority, number> = {
  highest: 0,
  high: 1,
  medium: 2,
  lower: 3,
};

// ---------- Support rules (configurable — MVP starting values) ----------

export interface SupportRule {
  category: SupportCategory;
  priority: SupportPriority;
}

/** Default tier/category for a support signal. Some signals (participation
 * gap, consistency decline, attention flags, repurchase) escalate their tier
 * at derivation time based on severity; the value here is the baseline. */
export const SUPPORT_RULES: Record<SupportType, SupportRule> = {
  participation_gap: { category: "behaviour", priority: "attention" },
  consistency_declining: { category: "behaviour", priority: "attention" },
  low_consistency: { category: "behaviour", priority: "attention" },
  missed_evening_reflection: { category: "behaviour", priority: "reminder" },
  attention_flag: { category: "behaviour", priority: "attention" },
  insufficient_data: { category: "behaviour", priority: "reminder" },
  repurchase: { category: "product", priority: "attention" },
  out_of_stock: { category: "product", priority: "urgent" },
  body_progress_overdue: { category: "milestones", priority: "attention" },
  journey_completion_due: { category: "milestones", priority: "reminder" },
  goal_weight_due: { category: "milestones", priority: "reminder" },
};

export const SUPPORT_PRIORITY_ORDER: Record<SupportPriority, number> = {
  urgent: 0,
  attention: 1,
  reminder: 2,
};

export const SUPPORT_CATEGORY_ORDER: SupportCategory[] = ["behaviour", "product", "milestones"];

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  behaviour: "参与行为",
  product: "产品",
  milestones: "里程碑",
};

export const SUPPORT_PRIORITY_LABELS: Record<SupportPriority, string> = {
  urgent: "紧急",
  attention: "关注",
  reminder: "提示",
};

export const SUPPORT_PRIORITY_STYLES: Record<SupportPriority, string> = {
  urgent: "bg-rose-50 text-rose-600",
  attention: "bg-amber-50 text-amber-700",
  reminder: "bg-sky-50 text-sky-600",
};

// ---------- Journey Consistency thresholds ----------
// TEMPORARY MVP DEFAULTS — configurable, not permanent product rules.

export const CONSISTENCY_THRESHOLDS = {
  /** Only start evaluating consistency from this Journey Day onward. */
  startFromJourneyDay: 4,
  /** Consecutive days without any meaningful participation. */
  gapAttentionDays: 3,
  gapUrgentDays: 5,
  /** Recent vs previous participation window (days). */
  declineWindowDays: 7,
  /** recent/previous activity ratio thresholds. */
  declineAttentionRatio: 0.5,
  declineUrgentRatio: 0.25,
} as const;

/** Low check-in consistency: fewer than this fraction of Journey days
 * checked in. Configurable. */
export const LOW_CHECKIN_RATE = 0.5;

/** A customer with fewer than this many check-ins is "insufficient data". */
export const INSUFFICIENT_DATA_CHECKINS = 3;
