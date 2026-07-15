import type { JourneyDays } from "@/lib/goals/types";

// ---------- Journey naming (official positioning) ----------

export interface JourneyName {
  name: string;
  emoji: string;
}

// ---------- Celebrations ----------

export type CelebrationType =
  | "goal_weight_achieved"
  | "transformation_complete"
  | "momentum_complete"
  | "kickstart_complete"
  | "first_body_progress"
  | "new_lowest_weight"
  | "streak_30"
  | "streak_7";

export type CelebrationPriority = "highest" | "high" | "medium" | "lower";

export interface CelebrationItem {
  customerId: string;
  customerName: string;
  avatar: string | null;
  type: CelebrationType;
  priority: CelebrationPriority;
  journeyDay: number;
  journeyName: JourneyName;
  /** Coach-perspective "why celebrate today" narrative. */
  reasonNarrative: string;
  occurredOn: string;
}

// ---------- Support ----------

export type SupportCategory = "behaviour" | "product" | "milestones";
export type SupportPriority = "urgent" | "attention" | "reminder";

export type SupportType =
  | "participation_gap"
  | "consistency_declining"
  | "low_consistency"
  | "missed_evening_reflection"
  | "attention_flag"
  | "insufficient_data"
  | "repurchase"
  | "out_of_stock"
  | "body_progress_overdue"
  | "journey_completion_due"
  | "goal_weight_due";

export interface SupportReasonLine {
  type: SupportType;
  text: string;
  priority: SupportPriority;
}

export interface SupportItem {
  customerId: string;
  customerName: string;
  avatar: string | null;
  /** The highest-priority signal — decides tier + category placement. */
  primaryType: SupportType;
  category: SupportCategory;
  priority: SupportPriority;
  journeyDay: number;
  journeyName: JourneyName;
  /** Full "why today" narrative — primary reason plus supporting detail. */
  reasonNarrative: string;
  /** Individual reasons behind this customer surfacing, most severe first. */
  reasons: SupportReasonLine[];
}

// ---------- Participation (product-independent) ----------

/** A generic participation input. The consistency engine reasons only about
 * these — it never knows what "MISU usage" is. Product-specific adapters
 * (misu.ts today; hair/skincare later) map real data into these signals. */
export interface ParticipationSignal {
  type: string;
  /** ISO dates (YYYY-MM-DD) on which this activity happened. */
  activityDates: string[];
}

export type ConsistencyLevel = "steady" | "slowing" | "declining";

export interface ConsistencyAssessment {
  evaluated: boolean;
  level: ConsistencyLevel;
  daysSinceLastActivity: number | null;
  /** null when the customer is fine / not evaluated; otherwise the support
   * tier this consistency concern warrants. */
  tier: SupportPriority | null;
  humanMessage: string | null;
}

// ---------- Journey Timeline ----------

export type TimelineEventKind =
  | "journey_started"
  | "first_body_progress"
  | "new_lowest_weight"
  | "journey_completed"
  | "recent_missed_checkins"
  | "recent_support_signal";

export interface TimelineEvent {
  kind: TimelineEventKind;
  label: string;
  date: string | null;
}

// ---------- Coaching Scripts ----------

export type ScriptIntent = "celebrate" | "reconnect" | "encourage" | "educate" | "repurchase_support";

export type ScriptSituation =
  | "missed_checkin"
  | "low_consistency"
  | "journey_consistency"
  | "repurchase"
  | "journey_completed"
  | "new_lowest_weight"
  | "first_body_progress";

export interface CoachScript {
  situation: ScriptSituation;
  intent: ScriptIntent;
  tone: string;
  /** May contain {{Variables}} — see COACH_SCRIPT_VARIABLES. */
  script: string;
  variables: string[];
}

export interface ScriptRenderContext {
  CustomerName: string;
  CoachName: string;
  JourneyName: string;
  JourneyDay: string;
  CurrentWeight: string;
  LowestWeight: string;
  RemainingProducts: string;
  SupportReason: string;
  CurrentChallenge: string;
}

// ---------- Home: one card per customer (customer-centric) ----------

/** A short, glanceable tag on the Home customer card. The Home answers
 * "who should I talk to today?" — never a paragraph. All explanation lives
 * in the Focus View. */
export type SignalKind = "celebration" | "support";

export interface CustomerSignalTag {
  kind: SignalKind;
  icon: string;
  label: string;
  /** Position on the unified overall-priority scale — lower is more important. */
  rank: number;
}

/** One customer = one card. All celebration and support signals for a
 * customer are aggregated here so the Coach decides to contact them once. */
export interface CoachCustomerCard {
  customerId: string;
  customerName: string;
  avatar: string | null;
  journeyName: JourneyName;
  journeyDay: number;
  celebrationTags: CustomerSignalTag[];
  supportTags: CustomerSignalTag[];
  /** min rank across all tags — drives card ordering. */
  overallRank: number;
  /** Which dimension leads the card's accent styling. */
  overallTone: SignalKind;
}

/** Encouraging, non-KPI coaching statistics shown under the greeting. */
export interface CoachImpact {
  totalCustomers: number;
  journeysCompleted: number;
  journeysInProgress: number;
  journeysCompletedThisMonth: number;
}

// ---------- Workspace ----------

export interface CoachWorkspace {
  /** Raw celebration events (kept for the Today's Summary count + Focus View). */
  celebrations: CelebrationItem[];
  /** Raw support items, one per customer (kept for the count + Focus View). */
  support: SupportItem[];
  /** Home display: one aggregated card per customer, ordered by overallRank. */
  cards: CoachCustomerCard[];
  impact: CoachImpact;
  /** Distinct customers with ≥1 celebration today. */
  celebrateCustomerCount: number;
  /** Distinct customers who may need support today. */
  supportCustomerCount: number;
}

export type { JourneyDays };
