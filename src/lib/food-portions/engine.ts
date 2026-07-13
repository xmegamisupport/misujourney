import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { FOOD_CATEGORY_META } from "./constants";
import type { FoodCategory, FoodPortionOption, SelectedPortion } from "./types";

type FoodPortionRow = Database["public"]["Tables"]["food_portions"]["Row"];

function mapPortionRow(row: FoodPortionRow): FoodPortionOption {
  return {
    id: row.id,
    category: row.portion_type as FoodCategory,
    displayName: row.display_name,
    emoji: row.emoji,
    portionLabel: row.portion_label,
    portionValue: Number(row.portion_value),
    isBaseUnit: row.is_base_unit,
    gram: Number(row.gram),
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbohydrate: Number(row.carbohydrate),
    fat: Number(row.fat),
    fiber: Number(row.fiber),
  };
}

/** Fixed catalog options for a category, e.g. category="rice" -> 半碗/一碗/一碗半/两碗. */
export async function getPortionOptions(category: FoodCategory): Promise<FoodPortionOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("food_portions")
    .select("*")
    .eq("portion_type", category)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapPortionRow);
}

/** Turns "其他" custom input (a multiplier of the category's base unit, e.g.
 * 0.3碗 / 2.5个手掌 / 4颗) into a selected portion. Nutrition scales linearly
 * off the base-unit row — grams/macros still never come from AI. */
export function buildCustomPortion(options: FoodPortionOption[], multiplier: number): SelectedPortion | undefined {
  const base = options.find((o) => o.isBaseUnit) ?? options[0];
  if (!base || !(multiplier > 0)) return undefined;
  return {
    category: base.category,
    portionLabel: `${multiplier}${FOOD_CATEGORY_META[base.category].unitName}`,
    gram: Math.round(base.gram * multiplier * 10) / 10,
    calories: Math.round(base.calories * multiplier),
    protein: Math.round(base.protein * multiplier * 10) / 10,
    carbohydrate: Math.round(base.carbohydrate * multiplier * 10) / 10,
    fat: Math.round(base.fat * multiplier * 10) / 10,
    fiber: Math.round(base.fiber * multiplier * 10) / 10,
    isCustom: true,
  };
}

export function toSelectedPortion(option: FoodPortionOption): SelectedPortion {
  return {
    category: option.category,
    portionLabel: option.portionLabel,
    gram: option.gram,
    calories: option.calories,
    protein: option.protein,
    carbohydrate: option.carbohydrate,
    fat: option.fat,
    fiber: option.fiber,
    isCustom: false,
  };
}
