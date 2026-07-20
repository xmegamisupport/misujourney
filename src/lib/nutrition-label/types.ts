export interface LabelNutrients {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber: number;
}

/** What the model reads off the packet. Both columns are required, not because
 * we need both, but because having both is what lets us check the reading — see
 * verifyLabel(). */
export interface NutritionLabelReading {
  productName: string;
  brand: string;
  /** Grams in one stated serving. */
  servingSizeG: number;
  servingsPerPackage: number;
  per100g: LabelNutrients;
  perServing: LabelNutrients;
}

export type LabelAmountChoice = "package" | "half_package" | "serving" | "custom";

export interface LabelVerdict {
  ok: boolean;
  /** Customer-facing reason when ok is false. */
  reason?: string;
}
