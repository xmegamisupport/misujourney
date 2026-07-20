import type { LabelAmountChoice, LabelNutrients, LabelVerdict, NutritionLabelReading } from "./types";

/** A reading is only trusted if its two columns agree with each other.
 *
 * The dominant failure mode when reading a nutrition panel is not blurry text —
 * it is reading the WRONG COLUMN. Malaysian labels print 每 100g beside 每一份,
 * and confusing them silently produces a 3–7x error that looks completely
 * plausible: no missing fields, no odd characters, just wrong numbers. That is
 * the worst kind of failure, because nothing downstream can detect it.
 *
 * So we require the model to report both columns, then check the arithmetic
 * that must hold between them: perServing ≈ per100g × servingSize / 100. If the
 * model swapped or misaligned the columns, this identity breaks immediately.
 * A reading that fails is thrown away, not "best effort" — a wrong number the
 * customer trusts is worse than asking her to take the photo again.
 */

/** Generous enough for label rounding (many panels round to whole numbers, so a
 * 2g serving can legitimately be off by 25%), tight enough that a column mix-up
 * — which is a multiple, not a percentage — can never slip through. */
const TOLERANCE = 0.35;
/** Below this, rounding noise dominates and the ratio test is meaningless. */
const MIN_MEANINGFUL_KCAL = 5;

const NUTRIENT_KEYS: (keyof LabelNutrients)[] = ["calories", "protein", "carbohydrate", "fat", "fiber"];

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export function verifyLabel(reading: NutritionLabelReading): LabelVerdict {
  if (!finite(reading.servingSizeG) || reading.servingSizeG <= 0) {
    return { ok: false, reason: "看不清楚每份的重量，请对准营养成分表再拍一次。" };
  }
  if (!finite(reading.servingsPerPackage) || reading.servingsPerPackage <= 0) {
    return { ok: false, reason: "看不清楚这包有几份，请对准营养成分表再拍一次。" };
  }
  for (const key of NUTRIENT_KEYS) {
    if (!finite(reading.per100g[key]) || !finite(reading.perServing[key])) {
      return { ok: false, reason: "营养成分表有一些数字看不清楚，请靠近一点再拍一次。" };
    }
  }
  if (reading.per100g.calories < MIN_MEANINGFUL_KCAL) {
    return { ok: false, reason: "读到的热量数字不合理，请对准营养成分表再拍一次。" };
  }

  // The identity that must hold if both columns were read from the right places.
  const ratio = reading.servingSizeG / 100;
  const expected = reading.per100g.calories * ratio;
  if (expected < MIN_MEANINGFUL_KCAL) {
    return { ok: false, reason: "读到的份量太小，请对准营养成分表再拍一次。" };
  }

  const drift = Math.abs(reading.perServing.calories - expected) / expected;
  if (drift > TOLERANCE) {
    return { ok: false, reason: "营养成分表读得不太确定，请对准表格、光线明亮一点再拍一次。" };
  }

  return { ok: true };
}

/** How many grams the customer actually ate.
 *
 * Deliberately asked rather than assumed. A 20g snack packet and a 500g share
 * bag both print a per-serving column, and the difference between "ate the
 * packet" and "ate one serving" can be ten times the calories. Reading the
 * label perfectly and then guessing this would waste the accuracy we just won. */
export function gramsForChoice(reading: NutritionLabelReading, choice: LabelAmountChoice, customGram?: number): number | null {
  const packageGram = reading.servingSizeG * reading.servingsPerPackage;
  switch (choice) {
    case "package":
      return packageGram > 0 ? packageGram : null;
    case "half_package":
      return packageGram > 0 ? packageGram / 2 : null;
    case "serving":
      return reading.servingSizeG > 0 ? reading.servingSizeG : null;
    case "custom":
      return finite(customGram) && customGram > 0 ? customGram : null;
  }
}

/** Scale the verified per-100g column to the grams eaten.
 *
 * Always from per100g, never from perServing: per100g is the column that
 * survived the cross-check as a rate, and scaling a rate is exact. Rounded to
 * one decimal because the label itself is rounded — carrying more digits would
 * imply a precision the packet never had. */
export function nutrientsForGrams(reading: NutritionLabelReading, gram: number): LabelNutrients {
  const factor = gram / 100;
  const round = (n: number) => Math.round(n * factor * 10) / 10;
  return {
    calories: Math.round(reading.per100g.calories * factor),
    protein: round(reading.per100g.protein),
    carbohydrate: round(reading.per100g.carbohydrate),
    fat: round(reading.per100g.fat),
    fiber: round(reading.per100g.fiber),
  };
}

export function amountLabel(reading: NutritionLabelReading, choice: LabelAmountChoice, gram: number): string {
  switch (choice) {
    case "package":
      return `一包 ${Math.round(gram)}g`;
    case "half_package":
      return `半包 ${Math.round(gram)}g`;
    case "serving":
      return `一份 ${Math.round(reading.servingSizeG)}g`;
    case "custom":
      return `${Math.round(gram)}g`;
  }
}
