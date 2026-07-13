import type { Enums } from "@/lib/supabase/database.types";

export type ActivityLevel = Enums<"activity_level">;

export interface JourneyNutritionTargets {
  id: string;
  customerId: string;
  journeyId: string;
  journeyStartWeightKg: number;
  bmr: number;
  tdee: number;
  activityLevel: ActivityLevel;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbohydrate: number;
  dailyFat: number;
  dailyFiber: number;
  calculationMethod: string;
  createdAt: string;
}
