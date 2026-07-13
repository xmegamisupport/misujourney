import type { FoodCategory } from "./types";

/** `unitName` is the counting word used to build the "其他" custom-portion
 * input label, e.g. "0.8" + "碗" for rice, "2.5" + "个手掌" for chicken. */
export const FOOD_CATEGORY_META: Record<FoodCategory, { emoji: string; label: string; unitName: string }> = {
  rice: { emoji: "🍚", label: "白饭", unitName: "碗" },
  noodle: { emoji: "🍜", label: "面类", unitName: "碗" },
  congee: { emoji: "🥣", label: "粥", unitName: "碗" },
  bread: { emoji: "🍞", label: "面包", unitName: "片" },
  chicken: { emoji: "🍗", label: "鸡肉", unitName: "个手掌" },
  beef: { emoji: "🥩", label: "牛肉", unitName: "个手掌" },
  fish: { emoji: "🐟", label: "鱼肉", unitName: "块" },
  egg: { emoji: "🥚", label: "鸡蛋", unitName: "颗" },
  vegetable: { emoji: "🥬", label: "蔬菜", unitName: "份" },
  broccoli: { emoji: "🥦", label: "花椰菜", unitName: "份" },
  fruit: { emoji: "🍎", label: "水果", unitName: "份" },
  milk: { emoji: "🥛", label: "牛奶", unitName: "杯" },
  drink: { emoji: "🥤", label: "饮料", unitName: "杯" },
  fried: { emoji: "🍟", label: "炸物", unitName: "份" },
  dessert: { emoji: "🍰", label: "甜品", unitName: "份" },
};

export const FOOD_CATEGORY_OPTIONS: FoodCategory[] = [
  "rice",
  "noodle",
  "congee",
  "bread",
  "chicken",
  "beef",
  "fish",
  "egg",
  "vegetable",
  "broccoli",
  "fruit",
  "milk",
  "drink",
  "fried",
  "dessert",
];
