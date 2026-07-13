export type AnalysisType = "weekly_7_day" | "biweekly_14_day";
export type DataQuality = "sufficient" | "limited";
export type FlagSeverity = "info" | "attention" | "important";

export interface TrendSummaryPeriod {
  startDate: string;
  endDate: string;
  days: number;
}

export interface WeightTrendSummary {
  validEntries: number;
  firstWeight: number | null;
  latestWeight: number | null;
  changeKg: number | null;
  trend: "down" | "up" | "stable" | "insufficient";
}

export interface BowelMovementSummary {
  zeroDays: number;
  oneTimeDays: number;
  twoOrMoreDays: number;
  longestZeroStreak: number;
  loggedDays: number;
}

export interface SpecialConditionCounts {
  gathering: number;
  eating_out: number;
  period: number;
  late_night: number;
  sick: number;
  stress: number;
  travel: number;
  other: number;
}

export interface HabitCompletionSummary {
  waterTargetDays: number;
  plate211Meals: number;
  foodCheckInDays: number;
  misuNTotalSachets: number;
  misuDxTotalSachets: number;
  avgSleepHours: number | null;
}

/** The fixed-rule structured summary — this, not the raw database rows, is
 * what ever reaches OpenAI ("不要把整个数据库直接传给AI"). */
export interface CustomerTrendSummary {
  customerId: string;
  period: TrendSummaryPeriod;
  weight: WeightTrendSummary;
  bowelMovement: BowelMovementSummary;
  specialConditions: SpecialConditionCounts;
  habits: HabitCompletionSummary;
  notesSummary: string[];
  attentionTags: string[];
  dataQuality: DataQuality;
}

export interface AttentionFlag {
  id: string;
  customerId: string;
  flagType: string;
  flagLabel: string;
  severity: FlagSeverity;
  sourceStartDate: string;
  sourceEndDate: string;
  isActive: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  customerId: string;
  periodStart: string;
  periodEnd: string;
  analysisType: AnalysisType;
  summary: string;
  possibleFactors: string[];
  positiveProgress: string[];
  coachFocus: string[];
  customerMessage: string;
  dataQuality: DataQuality;
  medicalCaution: boolean;
  generatedAt: string;
}

export interface InsightEngineResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}
