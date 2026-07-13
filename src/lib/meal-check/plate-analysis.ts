import type { FoodCategory } from "@/lib/food-portions/types";
import type { MealEntry } from "@/lib/types";

export type PlateGroup = "vegetable" | "protein" | "carb" | "other";

const PLATE_GROUPS: Record<FoodCategory, PlateGroup> = {
  vegetable: "vegetable",
  broccoli: "vegetable",
  chicken: "protein",
  beef: "protein",
  fish: "protein",
  egg: "protein",
  rice: "carb",
  noodle: "carb",
  congee: "carb",
  bread: "carb",
  fruit: "other",
  milk: "other",
  drink: "other",
  fried: "other",
  dessert: "other",
};

export interface PlateAnalysisInput {
  category: FoodCategory;
  gram: number;
}

export interface PlateAnalysisResult {
  vegetablePercent: number;
  proteinPercent: number;
  carbPercent: number;
  score: number;
  goodPoints: string[];
  improvePoints: string[];
}

type TargetGroup = "vegetable" | "protein" | "carb";

/** Target band per group, in percent of (veg+protein+carb) gram weight —
 * the single source of truth for both the score/notes below and the
 * customer-facing status chips (buildPlateGroupChecks). */
const TARGET_BANDS: Record<TargetGroup, { low: number; high: number }> = {
  vegetable: { low: 40, high: 60 },
  protein: { low: 15, high: 35 },
  carb: { low: 15, high: 35 },
};

/** Deterministic 211-plate analysis (2 份蔬菜 : 1 份蛋白质 : 1 份主食, i.e. a
 * 50/25/25 gram-weighted target). Entirely rule-based — no AI — so the score
 * and ✅/⚠️ notes are reproducible and never invented by the model. */
export function calculatePlateAnalysis(items: PlateAnalysisInput[]): PlateAnalysisResult {
  let vegGram = 0;
  let proteinGram = 0;
  let carbGram = 0;

  for (const item of items) {
    const group = PLATE_GROUPS[item.category];
    if (group === "vegetable") vegGram += item.gram;
    else if (group === "protein") proteinGram += item.gram;
    else if (group === "carb") carbGram += item.gram;
  }

  const groupTotal = vegGram + proteinGram + carbGram;
  if (groupTotal <= 0) {
    return {
      vegetablePercent: 0,
      proteinPercent: 0,
      carbPercent: 0,
      score: 2,
      goodPoints: [],
      improvePoints: ["这一餐还没有记录蔬菜、蛋白质或主食，暂时无法计算 211 比例"],
    };
  }

  const vegetablePercent = Math.round((vegGram / groupTotal) * 100);
  const proteinPercent = Math.round((proteinGram / groupTotal) * 100);
  const carbPercent = Math.max(0, 100 - vegetablePercent - proteinPercent);

  const goodPoints: string[] = [];
  const improvePoints: string[] = [];
  let goodCount = 0;

  if (vegetablePercent < TARGET_BANDS.vegetable.low) {
    improvePoints.push("蔬菜可以再增加一些");
  } else if (vegetablePercent <= TARGET_BANDS.vegetable.high) {
    goodPoints.push("蔬菜比例均衡");
    goodCount += 1;
  } else {
    improvePoints.push("蔬菜比例偏高，可以搭配多一点蛋白质与主食");
  }

  if (proteinPercent < TARGET_BANDS.protein.low) {
    improvePoints.push("蛋白质不足，可以再增加一些");
  } else if (proteinPercent <= TARGET_BANDS.protein.high) {
    goodPoints.push("蛋白质充足");
    goodCount += 1;
  } else {
    improvePoints.push("蛋白质偏高，可以搭配更多蔬菜");
  }

  if (carbPercent < TARGET_BANDS.carb.low) {
    improvePoints.push("主食偏少，可以再增加一些");
  } else if (carbPercent <= TARGET_BANDS.carb.high) {
    goodPoints.push("主食比例均衡");
    goodCount += 1;
  } else {
    improvePoints.push("白饭／面食稍微多一点，可以减少一些");
  }

  const score = goodCount === 3 ? 5 : goodCount === 2 ? 4 : goodCount === 1 ? 3 : 2;

  return { vegetablePercent, proteinPercent, carbPercent, score, goodPoints, improvePoints };
}

export function starString(score: number, max = 5): string {
  const filled = Math.max(0, Math.min(max, Math.round(score)));
  return "★".repeat(filled) + "☆".repeat(max - filled);
}

export type PlateGroupStatus = "good" | "high" | "low";

export interface PlateGroupCheck {
  group: TargetGroup;
  label: string;
  emoji: string;
  status: PlateGroupStatus;
  statusLabel: string;
  action: string;
}

const GROUP_META: Record<TargetGroup, { label: string; emoji: string }> = {
  vegetable: { label: "蔬菜", emoji: "🥬" },
  protein: { label: "蛋白质", emoji: "🍗" },
  carb: { label: "主食", emoji: "🍚" },
};

const GROUP_ACTIONS: Record<TargetGroup, Record<PlateGroupStatus, string>> = {
  vegetable: { low: "建议增加半份", good: "保持目前份量即可", high: "下一餐可以少一点蔬菜" },
  protein: { low: "可以再增加一些蛋白质", good: "保持目前份量即可", high: "下一餐可以减少一点蛋白质" },
  carb: { low: "主食偏少，可以再增加一些", good: "保持目前份量即可", high: "下一餐减少约半碗" },
};

function groupStatus(percent: number, group: TargetGroup): PlateGroupStatus {
  const band = TARGET_BANDS[group];
  if (percent < band.low) return "low";
  if (percent > band.high) return "high";
  return "good";
}

const STATUS_LABELS: Record<PlateGroupStatus, string> = { good: "刚刚好", high: "稍多", low: "偏少" };

/** Translates the same percentages behind calculatePlateAnalysis into a
 * customer-facing 🟢/🟡/🔴 status + one-line action per group — no new
 * calculation, just friendlier copy for the same underlying numbers. */
export function buildPlateGroupChecks(analysis: {
  vegetablePercent: number;
  proteinPercent: number;
  carbPercent: number;
}): PlateGroupCheck[] {
  const percents: Record<TargetGroup, number> = {
    vegetable: analysis.vegetablePercent,
    protein: analysis.proteinPercent,
    carb: analysis.carbPercent,
  };
  return (["vegetable", "protein", "carb"] as const).map((group) => {
    const status = groupStatus(percents[group], group);
    return {
      group,
      label: GROUP_META[group].label,
      emoji: GROUP_META[group].emoji,
      status,
      statusLabel: STATUS_LABELS[status],
      action: GROUP_ACTIONS[group][status],
    };
  });
}

const MAIN_MEAL_TYPES: MealEntry["type"][] = ["breakfast", "lunch", "dinner"];

/** One "份" per main meal (breakfast/lunch/dinner) — matches the app's
 * three-main-meal structure, not a separate configurable setting. */
export const VEGETABLE_SERVINGS_TARGET = MAIN_MEAL_TYPES.length;

/** A main meal counts as a vegetable "份" achieved when its recorded food
 * items (re-analyzed from the persisted category+gram, same as the 211
 * score) hit at least the vegetable target band — no separate stored flag. */
export function countVegetableServings(meals: MealEntry[]): number {
  return meals.filter((meal) => {
    if (!MAIN_MEAL_TYPES.includes(meal.type)) return false;
    const items = (meal.foodItems ?? []).map((f) => ({ category: f.category as FoodCategory, gram: f.gram }));
    const analysis = calculatePlateAnalysis(items);
    return analysis.vegetablePercent >= TARGET_BANDS.vegetable.low;
  }).length;
}

export function plateBalanceTier(score: number): { label: string; message: string; colorClass: string } {
  if (score >= 5) return { label: "Excellent", message: "这一餐已经很接近 211 餐盘。", colorClass: "text-emerald-600" };
  if (score === 4) return { label: "Good", message: "只需要调整一点点，就会更加均衡。", colorClass: "text-emerald-600" };
  return { label: "Needs Improvement", message: "这一餐可以再调整一下，下一餐会更均衡。", colorClass: "text-amber-600" };
}
