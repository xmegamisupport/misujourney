import type { ProductCode } from "../inventory/types";
import type { FoodCategory, SelectedPortion } from "../food-portions/types";

export interface MisuTagDraft {
  productCode: ProductCode;
  quantity: number;
}

/** AI-detection-stage shape: the AI only names the food and classifies it
 * into a fixed category — it never guesses a gram amount or macros. */
export interface FoodItemDraft {
  id: string;
  name: string;
  category: FoodCategory;
  portion?: SelectedPortion;
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

export interface PlateAnalysisSummary {
  vegetablePercent: number;
  proteinPercent: number;
  carbPercent: number;
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
  plateAnalysis: PlateAnalysisSummary;
  aiAdvice: string;
}
