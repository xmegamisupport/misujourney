import type { ProductCode } from "../inventory/types";
import type { NutritionTotals } from "./types";

/** Fixed per-pack nutrition. Never estimated by AI — the whole point of this
 * table is that MISU macros are known, so the model's job is only to detect
 * how many packs appear in the photo. */
export const MISU_FIXED_NUTRITION: Record<ProductCode, NutritionTotals> = {
  MISU_N_PLUS: { calories: 79, protein: 7, carbs: 10, fat: 1, fiber: 0 },
  MISU_DX_PLUS: { calories: 13, protein: 0, carbs: 0, fat: 0, fiber: 0 },
};
