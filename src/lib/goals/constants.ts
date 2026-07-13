import type { ActivityLevel, BmiCategory, DietType, GoalStatus, GoalType, JourneyDays } from "./types";

export const DIET_TYPE_LABELS: Record<DietType, string> = {
  regular: "一般饮食",
  vegetarian: "素食",
  ovo_lacto_vegetarian: "蛋奶素",
  vegan: "全素",
  other: "其他",
};

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "久坐",
  light: "轻度活动",
  moderate: "中度活动",
  high: "高度活动",
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  improve_diet: "改善饮食习惯",
  lose_weight: "减少体重",
  improve_routine: "提升生活规律",
  maintain_weight: "维持体重",
};

export const GOAL_TYPE_ICONS: Record<GoalType, string> = {
  improve_diet: "🥗",
  lose_weight: "⚖️",
  improve_routine: "🌙",
  maintain_weight: "🌿",
};

export const JOURNEY_PLAN_OPTIONS: { days: JourneyDays; label: string; recommended?: boolean }[] = [
  { days: 30, label: "30天习惯", recommended: true },
  { days: 60, label: "60天进阶" },
  { days: 90, label: "90天长期" },
];

export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  underweight: "体重过轻",
  normal: "正常范围",
  overweight: "超重",
  obese: "肥胖",
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  auto_approved: "目标已确认",
  auto_adjusted: "已为你拆分为阶段目标",
  goal_restricted: "已切换为习惯养成目标",
};
