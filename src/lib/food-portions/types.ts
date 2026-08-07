export type FoodCategory =
  | "rice"
  | "noodle"
  | "congee"
  | "bread"
  | "chicken"
  | "beef"
  | "fish"
  | "egg"
  | "vegetable"
  | "broccoli"
  | "fruit"
  | "milk"
  | "drink"
  | "fried"
  | "dessert";

export interface FoodPortionOption {
  id: string;
  category: FoodCategory;
  displayName: string;
  emoji: string;
  portionLabel: string;
  portionValue: number;
  isBaseUnit: boolean;
  gram: number;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber: number;
}

/** The portion the customer actually picked for one food item — never
 * shows `gram` in the UI, but it's carried through so the DB always has it. */
export interface SelectedPortion {
  category: FoodCategory;
  portionLabel: string;
  gram: number;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber: number;
  isCustom: boolean;
  /** Where a fixed (isCustom) portion came from, for the Confirm subtitle —
   * e.g. "来自包装上的营养标签" (default) or "来自 Food Library". */
  sourceNote?: string;
  /** Confidence origin of the nutrition, drives the badge on Confirm:
   * "library" → 🟢 MISU Verified, "ai_estimate" → 🟡 AI Estimate. */
  origin?: "library" | "ai_estimate";
}
