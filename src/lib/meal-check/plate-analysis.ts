import type { FoodCategory } from "@/lib/food-portions/types";

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

  if (vegetablePercent < 40) {
    improvePoints.push("蔬菜可以再增加一些");
  } else if (vegetablePercent <= 60) {
    goodPoints.push("蔬菜比例均衡");
    goodCount += 1;
  } else {
    improvePoints.push("蔬菜比例偏高，可以搭配多一点蛋白质与主食");
  }

  if (proteinPercent < 15) {
    improvePoints.push("蛋白质不足，可以再增加一些");
  } else if (proteinPercent <= 35) {
    goodPoints.push("蛋白质充足");
    goodCount += 1;
  } else {
    improvePoints.push("蛋白质偏高，可以搭配更多蔬菜");
  }

  if (carbPercent < 15) {
    improvePoints.push("主食偏少，可以再增加一些");
  } else if (carbPercent <= 35) {
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
