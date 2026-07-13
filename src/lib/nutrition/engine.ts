"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { JourneyNutritionTargets } from "./types";

type Row = Database["public"]["Tables"]["journey_nutrition_targets"]["Row"];

function mapRow(row: Row): JourneyNutritionTargets {
  return {
    id: row.id,
    customerId: row.customer_id,
    journeyId: row.journey_id,
    journeyStartWeightKg: Number(row.journey_start_weight_kg),
    bmr: Number(row.bmr),
    tdee: Number(row.tdee),
    activityLevel: row.activity_level,
    dailyCalories: row.daily_calories,
    dailyProtein: row.daily_protein,
    dailyCarbohydrate: row.daily_carbohydrate,
    dailyFat: row.daily_fat,
    dailyFiber: row.daily_fiber,
    calculationMethod: row.calculation_method,
    createdAt: row.created_at,
  };
}

/** All writes go through generate_journey_nutrition_target(), called
 * internally by complete_registration_goals() once per Journey start — this
 * only reads the fixed-for-the-Journey result, never recomputes client-side. */
export async function getCurrentNutritionTargets(customerId: string): Promise<JourneyNutritionTargets | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("journey_nutrition_targets")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : undefined;
}
