"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScoreCircle } from "@/components/ui/ScoreCircle";
import { EmptyState } from "@/components/ui/EmptyState";
import { currentCustomer } from "@/lib/mock-data";
import { addMeal } from "@/lib/added-meals";
import { recordMealMisuUsage } from "@/lib/inventory/engine";
import { PRODUCT_LABELS, PRODUCT_ICONS } from "@/lib/inventory/constants";
import type { MealScoredDraft } from "@/lib/meal-check/types";
import type { MealEntry } from "@/lib/types";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  return sessionStorage.getItem("misu-meal-scored");
}
function getServerSnapshot() {
  return null;
}

export default function MealResultPage() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const scored = useMemo<MealScoredDraft | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MealScoredDraft;
    } catch {
      return null;
    }
  }, [raw]);

  if (!scored) {
    return (
      <div className="px-4 py-10 md:px-8">
        <PageHeader title="营养分析结果" backHref="/customer/meals/add" />
        <EmptyState icon="📷" title="还没有分析结果" description="请先拍照并完成确认" />
      </div>
    );
  }

  return <MealResultView scored={scored} />;
}

function MealResultView({ scored }: { scored: MealScoredDraft }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const nutrients = [
    { label: "热量", value: scored.totals.calories, unit: "kcal", icon: "🔥" },
    { label: "蛋白质", value: scored.totals.protein, unit: "g", icon: "🥚" },
    { label: "碳水", value: scored.totals.carbs, unit: "g", icon: "🍚" },
    { label: "脂肪", value: scored.totals.fat, unit: "g", icon: "🥑" },
    { label: "纤维", value: scored.totals.fiber, unit: "g", icon: "🥦" },
  ];

  function handleComplete() {
    setError(null);

    if (scored.misuTags.length > 0) {
      const result = recordMealMisuUsage({
        mealId: scored.mealId,
        customerId: currentCustomer.id,
        misuItems: scored.misuTags,
        createdBy: "customer",
      });
      if (!result.ok) {
        setError(result.error ?? "库存扣除失败，请重试");
        return;
      }
    }

    const misuLabels = scored.misuTags.map((t) => `${PRODUCT_LABELS[t.productCode]}×${t.quantity}`);
    const foodLabels = scored.foodItems.map((f) => `${f.name}×${f.quantity}`);
    const name = [...misuLabels, ...foodLabels].join("、") || "这一餐";
    const photoEmoji = scored.misuTags[0] ? PRODUCT_ICONS[scored.misuTags[0].productCode] : "🍽️";

    const entry: MealEntry = {
      id: scored.mealId,
      type: scored.mealType as MealEntry["type"],
      misuItems: scored.misuTags,
      foodItems: scored.foodItems,
      name,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      photoEmoji,
      portion: `共 ${scored.misuTags.length + scored.foodItems.length} 项`,
      calories: scored.totals.calories,
      protein: scored.totals.protein,
      carbs: scored.totals.carbs,
      fat: scored.totals.fat,
      fiber: scored.totals.fiber,
      misuScore: scored.misuScore,
      goodPoints: scored.goodPoints,
      improvePoints: scored.improvePoints,
    };
    addMeal(entry);
    sessionStorage.removeItem("misu-meal-scored");
    router.push("/customer/meals");
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="营养分析结果" subtitle="Smart Meal Check" backHref="/customer/meals/confirm" />

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {scored.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scored.photo} alt="这一餐的照片" className="h-40 w-full object-cover" />
        ) : (
          <div className="flex items-center justify-center bg-emerald-50 py-8 text-6xl">🍽️</div>
        )}
        <div className="flex items-center justify-between gap-3 p-5">
          <div className="min-w-0 flex-1">
            {scored.misuTags.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {scored.misuTags.map((t) => (
                  <span
                    key={t.productCode}
                    className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                  >
                    {PRODUCT_ICONS[t.productCode]} {PRODUCT_LABELS[t.productCode]} × {t.quantity}
                  </span>
                ))}
              </div>
            )}
            {scored.foodItems.length > 0 && (
              <p className="truncate text-sm text-slate-500">
                {scored.foodItems.map((f) => `${f.name} × ${f.quantity}`).join("、")}
              </p>
            )}
          </div>
          <ScoreCircle value={scored.misuScore} size={76} label="MISU Meal Score" colorClass="text-emerald-500" trackClass="text-emerald-100" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {nutrients.map((n) => (
          <div key={n.label} className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
            <span className="text-lg">{n.icon}</span>
            <span className="text-sm font-semibold text-slate-900">
              {n.value}
              <span className="ml-0.5 text-xs font-normal text-slate-400">{n.unit}</span>
            </span>
            <span className="text-[11px] text-slate-400">{n.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
          <span>✅</span>做得好的地方
        </p>
        <ul className="flex flex-col gap-1.5">
          {scored.goodPoints.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-0.5 text-emerald-500">•</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700">
          <span>💡</span>可以改善的地方
        </p>
        <ul className="flex flex-col gap-1.5">
          {scored.improvePoints.slice(0, 3).map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-0.5 text-amber-500">•</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleComplete}
          className="rounded-xl bg-emerald-500 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        >
          完成记录
        </button>
        <Link
          href="/customer/meals/add"
          className="rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-600 transition hover:border-slate-300"
        >
          重新拍照
        </Link>
      </div>
    </div>
  );
}
