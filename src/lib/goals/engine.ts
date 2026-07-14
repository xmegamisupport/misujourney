"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type {
  ActivityLevel,
  CustomerGoal,
  DietType,
  GoalAssessment,
  GoalEngineResult,
  GoalPlan,
  GoalType,
  JourneyDays,
  WeightGoalRule,
} from "./types";

type CustomerGoalRow = Database["public"]["Tables"]["customer_goals"]["Row"];
type GoalPlanRow = Database["public"]["Tables"]["goal_plans"]["Row"];
type GoalAssessmentRow = Database["public"]["Tables"]["goal_assessments"]["Row"];
type WeightGoalRuleRow = Database["public"]["Tables"]["weight_goal_rules"]["Row"];

function mapCustomerGoalRow(row: CustomerGoalRow): CustomerGoal {
  return {
    id: row.id,
    customerId: row.customer_id,
    currentStage: row.current_stage,
    stageGoalWeightMin: Number(row.stage_goal_weight_min),
    stageGoalWeightMax: Number(row.stage_goal_weight_max),
    isCustomGoal: row.is_custom_goal,
    baseWeightKg: Number(row.base_weight_kg),
    waterTargetMl: row.water_target_ml,
    longTermGoalWeight: row.long_term_goal_weight === null ? null : Number(row.long_term_goal_weight),
    goalStatus: row.goal_status,
    createdAt: row.created_at,
  };
}

function mapGoalPlanRow(row: GoalPlanRow): GoalPlan {
  return {
    id: row.id,
    customerId: row.customer_id,
    journeyDays: row.journey_days as GoalPlan["journeyDays"],
    targetCheckInDays: row.target_check_in_days,
    target211Meals: row.target_211_meals,
    targetWaterDays: row.target_water_days,
    targetMisuDays: row.target_misu_days,
    createdAt: row.created_at,
  };
}

function mapGoalAssessmentRow(row: GoalAssessmentRow): GoalAssessment {
  return {
    id: row.id,
    customerId: row.customer_id,
    bmi: Number(row.bmi),
    bmiCategory: row.bmi_category,
    suggestedStageGoalMin: Number(row.suggested_stage_goal_min),
    suggestedStageGoalMax: Number(row.suggested_stage_goal_max),
    longTermGoal: row.long_term_goal === null ? null : Number(row.long_term_goal),
    goalStatus: row.goal_status,
    createdAt: row.created_at,
  };
}

function mapWeightGoalRuleRow(row: WeightGoalRuleRow): WeightGoalRule {
  return {
    id: row.id,
    minWeightKg: row.min_weight === null ? null : Number(row.min_weight),
    maxWeightKg: row.max_weight === null ? null : Number(row.max_weight),
    journeyDays: row.journey_days as JourneyDays,
    minLossKg: Number(row.min_loss_kg),
    maxLossKg: Number(row.max_loss_kg),
  };
}

export async function getCurrentCustomerGoal(customerId: string): Promise<CustomerGoal | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customer_goals")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCustomerGoalRow(data) : undefined;
}

export async function getCurrentGoalPlan(customerId: string): Promise<GoalPlan | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goal_plans")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapGoalPlanRow(data) : undefined;
}

export async function getLatestGoalAssessment(customerId: string): Promise<GoalAssessment | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goal_assessments")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapGoalAssessmentRow(data) : undefined;
}

/** Batched lookup for a Coach's customer roster, grouped by customer id —
 * same pattern as getInventoryForCustomers in the inventory engine. */
export async function getCurrentGoalsForCustomers(customerIds: string[]): Promise<Record<string, CustomerGoal>> {
  if (customerIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customer_goals")
    .select("*")
    .in("customer_id", customerIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const map: Record<string, CustomerGoal> = {};
  for (const row of data ?? []) {
    if (!map[row.customer_id]) map[row.customer_id] = mapCustomerGoalRow(row);
  }
  return map;
}

/** Batched lookup for a customer roster, grouped by customer id — same
 * pattern as getCurrentGoalsForCustomers. */
export async function getGoalPlansForCustomers(customerIds: string[]): Promise<Record<string, GoalPlan>> {
  if (customerIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goal_plans")
    .select("*")
    .in("customer_id", customerIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const map: Record<string, GoalPlan> = {};
  for (const row of data ?? []) {
    if (!map[row.customer_id]) map[row.customer_id] = mapGoalPlanRow(row);
  }
  return map;
}

/** Admin-configurable weight-loss suggestion table — fetched fresh so the
 * onboarding wizard's live preview always matches what the RPC will compute,
 * without hardcoding the rule table in the UI. */
export async function getWeightGoalRules(): Promise<WeightGoalRule[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("weight_goal_rules").select("*").eq("is_active", true);
  if (error) throw error;
  return (data ?? []).map(mapWeightGoalRuleRow);
}

export interface CompleteRegistrationGoalsInput {
  customerId: string;
  name: string;
  height: number;
  currentWeight: number;
  age: number;
  gender: "female" | "male";
  phone: string;
  dietType: DietType;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  journeyDays: JourneyDays;
  longTermGoalWeight?: number;
  referralCode?: string;
  useCustomGoal?: boolean;
  customLossKg?: number;
}

export interface CompleteRegistrationGoalsResult {
  bmi: number;
  bmiCategory: string;
  goalStatus: string;
  stageGoalWeightMin: number;
  stageGoalWeightMax: number;
  isCustomGoal: boolean;
  suggestedMin: number;
  suggestedMax: number;
  waterTargetMl: number;
  journeyDays: number;
  targetCheckInDays: number;
  target211Meals: number;
  targetWaterDays: number;
  targetMisuDays: number;
  coachMatched: boolean;
}

/** The only place onboarding data gets written — mirrors the RPC-for-writes
 * pattern used throughout the inventory system. All calculation happens
 * server-side in complete_registration_goals(); nothing computed client-side
 * (see ./goal-calculator.ts) is trusted or reused here. */
export async function completeRegistrationGoals(input: CompleteRegistrationGoalsInput): Promise<GoalEngineResult<CompleteRegistrationGoalsResult>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("complete_registration_goals", {
    p_customer_id: input.customerId,
    p_name: input.name,
    p_height: input.height,
    p_current_weight: input.currentWeight,
    p_age: input.age,
    p_gender: input.gender,
    p_phone: input.phone,
    p_diet_type: input.dietType,
    p_activity_level: input.activityLevel,
    p_goal_type: input.goalType,
    p_journey_days: input.journeyDays,
    p_long_term_goal_weight: input.longTermGoalWeight ?? undefined,
    p_referral_code: input.referralCode ?? undefined,
    p_use_custom_goal: input.useCustomGoal ?? false,
    p_custom_loss_kg: input.customLossKg ?? undefined,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as unknown as CompleteRegistrationGoalsResult };
}
