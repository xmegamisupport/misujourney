import type { MealEntry } from "./types";

export interface MealTypeOption {
  key: MealEntry["type"];
  label: string;
  icon: string;
}

export const mealTypeOptions: MealTypeOption[] = [
  { key: "breakfast", label: "早餐", icon: "🍳" },
  { key: "lunch", label: "午餐", icon: "🥗" },
  { key: "dinner", label: "晚餐", icon: "🍽️" },
  { key: "snack", label: "加餐", icon: "🍎" },
  { key: "bedtime", label: "睡前", icon: "🌙" },
];

export function mealTypeLabel(key: string): string {
  return mealTypeOptions.find((t) => t.key === key)?.label ?? key;
}

export function mealTypeIcon(key: string): string {
  return mealTypeOptions.find((t) => t.key === key)?.icon ?? "🍽️";
}
