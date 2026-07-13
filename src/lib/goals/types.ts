import type { Enums } from "@/lib/supabase/database.types";

export type DietType = Enums<"diet_type">;
export type ActivityLevel = Enums<"activity_level">;
export type GoalType = Enums<"goal_type">;
export type GoalStatus = Enums<"goal_status">;
export type BmiCategory = Enums<"bmi_category">;
export type JourneyDays = 30 | 60 | 90;

/** One admin-configurable row of the weight-loss suggestion table — a half
 * open weight band [minWeightKg, maxWeightKg) x journey length, mapped to a
 * suggested kg-loss range. Not hardcoded in the UI: fetched from the
 * `weight_goal_rules` table so an Admin can edit it without a redeploy. */
export interface WeightGoalRule {
  id: string;
  minWeightKg: number | null;
  maxWeightKg: number | null;
  journeyDays: JourneyDays;
  minLossKg: number;
  maxLossKg: number;
}

export interface WeightGoalRange {
  minLossKg: number;
  maxLossKg: number;
  minTargetWeightKg: number;
  maxTargetWeightKg: number;
}

export interface CustomerGoal {
  id: string;
  customerId: string;
  currentStage: number;
  stageGoalWeightMin: number;
  stageGoalWeightMax: number;
  isCustomGoal: boolean;
  baseWeightKg: number;
  longTermGoalWeight: number | null;
  goalStatus: GoalStatus;
  createdAt: string;
}

export interface GoalPlan {
  id: string;
  customerId: string;
  journeyDays: JourneyDays;
  targetCheckInDays: number;
  target211Meals: number;
  targetWaterDays: number;
  targetMisuDays: number;
  createdAt: string;
}

export interface GoalAssessment {
  id: string;
  customerId: string;
  bmi: number;
  bmiCategory: BmiCategory;
  suggestedStageGoalMin: number;
  suggestedStageGoalMax: number;
  longTermGoal: number | null;
  goalStatus: GoalStatus;
  createdAt: string;
}

export interface GoalEngineResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface OnboardingBasicInfo {
  name: string;
  age: number;
  gender: "female" | "male";
  phone: string;
  referralCode: string;
  height: number;
  currentWeight: number;
  dietType: DietType;
  activityLevel: ActivityLevel;
}
