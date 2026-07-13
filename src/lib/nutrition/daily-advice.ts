export interface DailyNutritionAdviceInput {
  caloriesPercent: number;
  proteinPercent: number;
  vegServingsDone: number;
  vegServingsTarget: number;
  waterPercent: number;
}

/** Deterministic, rule-based — picks exactly one, most-important tip for
 * today rather than listing everything at once. Priority order: hydration
 * first (affects everything else), then whether any vegetable was logged at
 * all, then protein, then the "good protein, add veg" nudge, then calorie
 * over/under-shoot, then a balanced-day compliment, then a generic fallback. */
export function buildDailyNutritionAdvice(input: DailyNutritionAdviceInput): string {
  const { caloriesPercent, proteinPercent, vegServingsDone, vegServingsTarget, waterPercent } = input;
  const vegDone = vegServingsDone >= vegServingsTarget;

  if (waterPercent < 40) return "今天喝水量偏低，记得多补充水分，保持代谢顺畅。";
  if (vegServingsDone === 0) return "今天还没有蔬菜记录，下一餐试试加一份蔬菜。";
  if (proteinPercent < 70) return "蛋白质摄取有点不足，下一餐可以增加一份蛋白质来源。";
  if (!vegDone) return "今天蛋白质表现不错，再增加一份蔬菜，今天整体营养就会更加均衡。";
  if (caloriesPercent > 120) return "今天热量摄取偏高，下一餐可以选择清淡一点。";
  if (caloriesPercent < 60) return "今天整体热量摄取偏低，记得按时用餐，别让身体挨饿。";
  return "今天整体营养非常均衡，继续保持这个节奏！";
}
