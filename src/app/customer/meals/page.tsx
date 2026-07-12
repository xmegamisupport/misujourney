"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { NutritionCard } from "@/components/ui/NutritionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { currentCustomer } from "@/lib/mock-data";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useTodayMeals } from "@/lib/inventory/hooks";
import { mealTypeOptions } from "@/lib/meal-types";
import { PRODUCT_LABELS, PRODUCT_ICONS } from "@/lib/inventory/constants";

export default function TodayMealsPage() {
  const c = currentCustomer;
  const { user } = useAuthUser();
  const { data: addedMeals } = useTodayMeals(user?.id ?? "");

  const addedTotals = addedMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fiber: acc.fiber + m.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader
        title="今日饮食"
        subtitle={`Day ${c.currentDay} / ${c.planLength}`}
        action={
          <Link
            href="/customer/meals/add"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-lg text-white shadow-sm"
          >
            +
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
        <NutritionCard label="热量" value={c.nutritionToday.calories + addedTotals.calories} target={c.nutritionTargets.calories} unit="kcal" icon="🔥" color="bg-amber-400" />
        <NutritionCard label="蛋白质" value={c.nutritionToday.protein + addedTotals.protein} target={c.nutritionTargets.protein} unit="g" icon="🥚" color="bg-sky-400" />
        <NutritionCard label="碳水" value={c.nutritionToday.carbs + addedTotals.carbs} target={c.nutritionTargets.carbs} unit="g" icon="🍚" color="bg-orange-400" />
        <NutritionCard label="脂肪" value={c.nutritionToday.fat + addedTotals.fat} target={c.nutritionTargets.fat} unit="g" icon="🥑" color="bg-rose-400" />
        <NutritionCard label="纤维" value={c.nutritionToday.fiber + addedTotals.fiber} target={c.nutritionTargets.fiber} unit="g" icon="🥦" color="bg-emerald-400" />
      </div>

      <div className="flex flex-col gap-4">
        {mealTypeOptions.map((type) => {
          const meal = addedMeals.find((m) => m.type === type.key) ?? c.meals.find((m) => m.type === type.key);
          return (
            <div key={type.key}>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <span>{type.icon}</span>
                {type.label}
              </p>
              {meal ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                    {meal.photoEmoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{meal.name}</p>
                    <p className="text-xs text-slate-400">
                      {meal.time} · {meal.portion} · {meal.calories}kcal
                    </p>
                    {((meal.misuItems && meal.misuItems.length > 0) || (meal.foodItems && meal.foodItems.length > 0)) && (
                      <p className="mt-1 truncate text-xs font-medium text-emerald-600">
                        {[
                          ...(meal.misuItems ?? []).map((m) => `${PRODUCT_ICONS[m.productCode]} ${PRODUCT_LABELS[m.productCode]} × ${m.quantity}`),
                          ...(meal.foodItems ?? []).map((f) => `${f.name} × ${f.quantity}`),
                        ].join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                    {meal.misuScore}分
                  </span>
                </div>
              ) : (
                <EmptyState
                  icon={type.icon}
                  title={`还没有记录${type.label}`}
                  description="拍照上传，让 AI 帮你分析这一餐"
                  action={
                    <Link href="/customer/meals/add" className="text-sm font-medium text-emerald-600">
                      去记录 →
                    </Link>
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
