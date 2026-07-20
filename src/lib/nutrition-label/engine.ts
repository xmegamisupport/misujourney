"use client";

import { createClient } from "@/lib/supabase/client";
import type { NutritionLabelReading } from "./types";

/** Contribute a read label to the shared product library.
 *
 * Nothing reads from that library yet — matching needs a key we have tested
 * against real labels, and choosing one now would be a guess. But collecting is
 * the part that cannot be done retroactively: a packet photographed today and
 * not saved is gone. So we gather now and decide how to match later.
 *
 * Never throws and never blocks: the library is a by-product of her recording a
 * meal, and it must not be able to cost her the meal. */
export async function savePackagedFood(reading: NutritionLabelReading): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.rpc("save_packaged_food", {
      p_brand: reading.brand ?? "",
      p_product_name: reading.productName ?? "",
      p_serving_size_g: reading.servingSizeG,
      p_servings_per_package: reading.servingsPerPackage,
      p_calories_per_100g: reading.per100g.calories,
      p_protein_per_100g: reading.per100g.protein,
      p_carbohydrate_per_100g: reading.per100g.carbohydrate,
      p_fat_per_100g: reading.per100g.fat,
      p_fiber_per_100g: reading.per100g.fiber,
    });
  } catch {
    // Intentionally silent.
  }
}
