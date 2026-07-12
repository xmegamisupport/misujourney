import type { ProductCode } from "../inventory/types";
import type { NutritionTotals } from "./types";

/** Fixed per-pack nutrition. Never estimated by AI — the whole point of this
 * table is that MISU macros are known, so the model's job is only to detect
 * how many packs appear in the photo. */
export const MISU_FIXED_NUTRITION: Record<ProductCode, NutritionTotals> = {
  MISU_N_PLUS: { calories: 79, protein: 7, carbs: 10, fat: 1, fiber: 0 },
  MISU_DX_PLUS: { calories: 13, protein: 0, carbs: 0, fat: 0, fiber: 0 },
};

/** Rough placeholder nutrition for a manually-typed food with no photo to
 * estimate from ("大概齐" per product decision — revisit once this ships and
 * real usage data shows whether it's worth a follow-up AI call instead). */
export const MANUAL_ADD_ESTIMATE = {
  caloriesPerUnit: 150,
  proteinPerUnit: 6,
  carbsPerUnit: 18,
  fatPerUnit: 5,
  fiberPerUnit: 2,
};
