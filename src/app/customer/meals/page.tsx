"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { NutritionCard } from "@/components/ui/NutritionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useTodayMeals } from "@/lib/inventory/hooks";
import { mealTypeOptions } from "@/lib/meal-types";
import { PRODUCT_LABELS, PRODUCT_ICONS } from "@/lib/inventory/constants";
import { starString } from "@/lib/meal-check/plate-analysis";
import { useCurrentNutritionTargets } from "@/lib/nutrition/hooks";
import type { MealEntry } from "@/lib/types";

export default function TodayMealsPage() {
  const { user } = useAuthUser();
  const { data: journey } = useJourneySummary(user?.id ?? "");
  const { data: addedMeals } = useTodayMeals(user?.id ?? "");
  const { data: nutritionTargets, loading: nutritionTargetsLoading } = useCurrentNutritionTargets(user?.id ?? "");

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
      {/* The meal hub, opened straight from the Dashboard. There is no longer a
          "+" here: every meal slot below is its own entry point, so the customer
          never has to say which meal she means twice. */}
      <PageHeader
        title="今日饮食"
        subtitle={`Day ${journey?.currentDay ?? 1} / ${journey?.planLength ?? 30}`}
        backHref="/customer"
      />

      {nutritionTargets ? (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
          <NutritionCard label="热量" value={addedTotals.calories} target={nutritionTargets.dailyCalories} unit="kcal" icon="🔥" color="bg-amber-400" />
          <NutritionCard label="蛋白质" value={addedTotals.protein} target={nutritionTargets.dailyProtein} unit="g" icon="🥚" color="bg-sky-400" />
          <NutritionCard label="碳水" value={addedTotals.carbs} target={nutritionTargets.dailyCarbohydrate} unit="g" icon="🍚" color="bg-orange-400" />
          <NutritionCard label="脂肪" value={addedTotals.fat} target={nutritionTargets.dailyFat} unit="g" icon="🥑" color="bg-rose-400" />
          <NutritionCard label="纤维" value={addedTotals.fiber} target={nutritionTargets.dailyFiber} unit="g" icon="🥦" color="bg-emerald-400" />
        </div>
      ) : !nutritionTargetsLoading ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
          完善身高/体重/年龄/性别/活动量资料后，将自动生成你的每日营养目标。
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {mealTypeOptions.map((type) => {
          // ALL meals of this type, not just the first: recording a second
          // snack used to be invisible here while still counting toward the
          // totals above, which made the numbers look wrong for no reason.
          const meals = addedMeals.filter((m) => m.type === type.key);
          return (
            <div key={type.key}>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <span>{type.icon}</span>
                {type.label}
              </p>
              {meals.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {meals.map((meal) => (
                    <RecordedMeal key={meal.id} meal={meal} />
                  ))}
                </div>
              ) : (
                // The meal type travels in the link, so the upload page opens
                // already knowing which meal this is.
                <EmptyState
                  icon={type.icon}
                  title={`还没有记录${type.label}`}
                  description="拍照上传，让 AI 帮你分析这一餐"
                  action={
                    <Link href={`/customer/meals/add?type=${type.key}`} className="text-sm font-medium text-emerald-600">
                      记录 →
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

/** A recorded meal, openable.
 *
 * Everything shown when expanded is already in memory — the analysis was stored
 * with the meal, so opening it costs no query and works for any meal recorded
 * today. Collapsed by default: the answer to "did I record lunch?" should be
 * visible without opening anything. */
function RecordedMeal({ meal }: { meal: MealEntry }) {
  const [open, setOpen] = useState(false);

  const items = [
    ...(meal.misuItems ?? []).map((m) => `${PRODUCT_ICONS[m.productCode]} ${PRODUCT_LABELS[m.productCode]} × ${m.quantity}`),
    ...(meal.foodItems ?? []).map((f) => `${f.name} ${f.portionLabel}`),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-slate-50/60"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
          {meal.photoEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{meal.name}</p>
          <p className="text-xs text-slate-400">
            {meal.time} · {meal.calories}kcal
          </p>
          {items.length > 0 && <p className="mt-1 truncate text-xs font-medium text-emerald-600">{items.join(" · ")}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-amber-500">
            {starString(meal.misuScore)}
          </span>
          <span className="text-[11px] text-slate-400">{open ? "收起 ▲" : "查看 ▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3.5 py-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "蛋白质", value: meal.protein },
              { label: "碳水", value: meal.carbs },
              { label: "脂肪", value: meal.fat },
              { label: "纤维", value: meal.fiber },
            ].map((n) => (
              <div key={n.label} className="rounded-xl bg-slate-50 py-2">
                <p className="text-sm font-semibold text-slate-700">{Math.round(n.value)}g</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{n.label}</p>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {items.map((item) => (
                <li key={item} className="text-xs text-slate-600">
                  · {item}
                </li>
              ))}
            </ul>
          )}

          {meal.goodPoints.length > 0 && (
            <p className="mt-3 text-xs leading-relaxed text-emerald-600">🟢 {meal.goodPoints.join(" · ")}</p>
          )}
          {meal.improvePoints.length > 0 && (
            <p className="mt-1 text-xs leading-relaxed text-amber-600">🟡 {meal.improvePoints.join(" · ")}</p>
          )}
          {meal.aiAdvice && (
            <div className="mt-3 rounded-xl bg-sky-50/60 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-slate-600">🤖 {meal.aiAdvice}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
