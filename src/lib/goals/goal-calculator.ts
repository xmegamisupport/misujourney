import type { BmiCategory, GoalStatus, GoalType, JourneyDays, WeightGoalRange, WeightGoalRule } from "./types";

/**
 * Fixed-rule goal calculations — no AI, no free-text weight targets. This
 * module mirrors complete_registration_goals() in
 * supabase/migrations/20260713040000_configurable_weight_goal_ranges.sql
 * exactly, so the wizard can preview BMI/goal-status/weight-range live as the
 * customer fills in each step. The RPC recomputes everything itself and is
 * the only thing that actually persists data — these functions never write,
 * they only render a preview.
 *
 * Every rule that can change (currently just the weight-band -> kg-loss-range
 * table) lives in the `weight_goal_rules` DB table, not in this file, so an
 * Admin can retune it without a redeploy. Functions here take the fetched
 * rules as a plain array — no direct DB coupling — which also keeps room to
 * extend matching beyond weight band later (BMI, body fat %, waist
 * circumference, disease risk, dietitian overrides, ...) without touching
 * every call site.
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

/** Whether a numeric weight-loss suggestion applies at all — restricted
 * customers and anyone whose goal isn't "lose_weight" get a habit-based
 * stage goal instead of a weight range. */
export function canSuggestWeightLoss(params: { bmi: number; goalType: GoalType; goalStatus: GoalStatus }): boolean {
  return params.goalStatus !== "goal_restricted" && params.bmi >= 18.5 && params.goalType === "lose_weight";
}

export function findWeightGoalRule(rules: WeightGoalRule[], currentWeightKg: number, journeyDays: JourneyDays): WeightGoalRule | null {
  return (
    rules.find(
      (rule) =>
        rule.journeyDays === journeyDays &&
        (rule.minWeightKg === null || currentWeightKg >= rule.minWeightKg) &&
        (rule.maxWeightKg === null || currentWeightKg < rule.maxWeightKg),
    ) ?? null
  );
}

/** Looks up the configured kg-loss range for this weight band + journey
 * length and converts it into a target-weight range. More loss maps to the
 * lower end of the target-weight range and vice versa. */
export function calculateWeightGoalRange(rules: WeightGoalRule[], currentWeightKg: number, journeyDays: JourneyDays): WeightGoalRange | null {
  const rule = findWeightGoalRule(rules, currentWeightKg, journeyDays);
  if (!rule) return null;
  return {
    minLossKg: rule.minLossKg,
    maxLossKg: rule.maxLossKg,
    minTargetWeightKg: Math.round((currentWeightKg - rule.maxLossKg) * 10) / 10,
    maxTargetWeightKg: Math.round((currentWeightKg - rule.minLossKg) * 10) / 10,
  };
}

export function isCustomLossWithinRange(customLossKg: number, range: WeightGoalRange): boolean {
  return customLossKg >= range.minLossKg && customLossKg <= range.maxLossKg;
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
