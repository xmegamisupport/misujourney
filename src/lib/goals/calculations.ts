import type { BmiCategory, GoalStatus, GoalType, JourneyDays } from "./types";

/**
 * Fixed-rule goal calculations — no AI, no free-text weight targets. This
 * module mirrors complete_registration_goals() in
 * supabase/migrations/20260712180024_profile_onboarding_and_grant_hardening.sql
 * exactly, so the wizard can preview BMI/stage-goal/journey-plan live as the
 * customer fills in each step. The RPC recomputes the same values itself and
 * is the only thing that actually persists anything — these functions never
 * write data, they only render a preview.
 */

export function calculateBMI(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function isAbnormalInput(heightCm: number, weightKg: number, age: number): boolean {
  return heightCm < 100 || heightCm > 250 || weightKg < 20 || weightKg > 300 || age < 13 || age > 100;
}

/** True when a long-term goal would put the customer below a healthy BMI. */
export function validateLongTermGoal(longTermGoalWeightKg: number, heightCm: number): boolean {
  const bmi = calculateBMI(heightCm, longTermGoalWeightKg);
  return bmi >= 18.5;
}

export function evaluateGoalStatus(params: {
  heightCm: number;
  currentWeightKg: number;
  age: number;
  bmi: number;
  goalType: GoalType;
  longTermGoalWeightKg: number | null;
}): GoalStatus {
  const { heightCm, currentWeightKg, age, bmi, goalType, longTermGoalWeightKg } = params;

  if (isAbnormalInput(heightCm, currentWeightKg, age)) return "goal_restricted";
  if (bmi < 18.5 && goalType === "lose_weight") return "goal_restricted";
  if (longTermGoalWeightKg !== null && !validateLongTermGoal(longTermGoalWeightKg, heightCm)) return "goal_restricted";
  if (longTermGoalWeightKg !== null && goalType === "lose_weight") return "auto_adjusted";
  return "auto_approved";
}

export function calculateStageGoal(currentWeightKg: number, bmi: number, goalType: GoalType, goalStatus: GoalStatus): number {
  if (goalStatus === "goal_restricted" || bmi < 18.5 || goalType !== "lose_weight") {
    return currentWeightKg;
  }
  const rate = bmi < 25 ? 0.97 : 0.95; // ~3% for normal-range BMI, ~5% (within the 3~5% band) for BMI>=25
  return Math.round(currentWeightKg * rate * 10) / 10;
}

export interface JourneyPlanTargets {
  targetCheckInDays: number;
  target211Meals: number;
  targetWaterDays: number;
  targetMisuDays: number;
}

/** Fixed ratios calibrated to the 30-day reference (25 check-in / 18 meals /
 * 20 water / 25 MISU days out of 30), scaled proportionally for 60/90 days. */
export function buildJourneyPlan(journeyDays: JourneyDays): JourneyPlanTargets {
  return {
    targetCheckInDays: Math.round((journeyDays * 25) / 30),
    target211Meals: Math.round((journeyDays * 18) / 30),
    targetWaterDays: Math.round((journeyDays * 20) / 30),
    targetMisuDays: Math.round((journeyDays * 25) / 30),
  };
}
