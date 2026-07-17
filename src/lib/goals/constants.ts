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

// Journey duration values (30/60/90) are unchanged — only the customer-facing
// framing. 60 is the guided default; its badge is social proof and is separate
// from the "selected" highlight (see Step 4).
export const JOURNEY_PLAN_OPTIONS: { days: JourneyDays; label: string; title: string; description: string; badge?: string }[] = [
  {
    days: 30,
    label: "30 天",
    title: "先把每天的小习惯做好",
    description: "从饮食、饮水和生活规律开始，让身体慢慢进入状态。",
  },
  {
    days: 60,
    label: "60 天",
    title: "让改变慢慢开始发生",
    description: "当习惯逐渐稳定下来，身体也会开始进入更稳定的减脂节奏。",
    badge: "最多人开始的 Journey",
  },
  {
    days: 90,
    label: "90 天",
    title: "让成果慢慢稳定下来",
    description: "给自己多一点时间，让好的习惯真正稳定，也让改变更容易保持下去。",
  },
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
