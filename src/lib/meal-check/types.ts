import type { ProductCode } from "../inventory/types";

export interface MisuTagDraft {
  productCode: ProductCode;
  quantity: number;
}

export interface FoodItemDraft {
  id: string;
  name: string;
  servingLabel: string;
  quantity: number;
  caloriesPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  fiberPerUnit: number;
  estimated?: boolean;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** Sessionstorage payload passed from the Add Meal page to the Confirm page. */
export interface MealDetectionDraft {
  mealType: string;
  photo?: string;
  misuTags: MisuTagDraft[];
  foodItems: FoodItemDraft[];
}

/** Sessionstorage payload passed from the Confirm page to the Result page.
 * `mealId` is generated once on confirm and reused for both the saved
 * MealEntry and the inventory deduction transaction, so a double "完成记录"
 * click can't deduct stock twice. */
export interface MealScoredDraft extends MealDetectionDraft {
  mealId: string;
  totals: NutritionTotals;
  misuScore: number;
  goodPoints: string[];
  improvePoints: string[];
}
