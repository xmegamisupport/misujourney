"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { recordMeal } from "@/lib/inventory/engine";
import { PRODUCT_LABELS, PRODUCT_ICONS } from "@/lib/inventory/constants";
import { starString } from "@/lib/meal-check/plate-analysis";
import { FOOD_CATEGORY_META } from "@/lib/food-portions/constants";
import type { MealScoredDraft } from "@/lib/meal-check/types";
import type { MealFoodItem } from "@/lib/types";

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
        <PageHeader title="211 餐盘分析" backHref="/customer/meals/add" />
        <EmptyState icon="📷" title="还没有分析结果" description="请先拍照并完成确认" />
      </div>
    );
  }

  return <MealResultView scored={scored} />;
}

function MealResultView({ scored }: { scored: MealScoredDraft }) {
  const router = useRouter();
  const { user } = useAuthUser();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ratioBars = [
    { label: "蔬菜", percent: scored.plateAnalysis.vegetablePercent, colorClass: "bg-emerald-400" },
    { label: "蛋白质", percent: scored.plateAnalysis.proteinPercent, colorClass: "bg-sky-400" },
    { label: "主食", percent: scored.plateAnalysis.carbPercent, colorClass: "bg-amber-400" },
  ];

  async function handleComplete() {
    if (!user) return;
    setError(null);
    setSubmitting(true);

    const misuLabels = scored.misuTags.map((t) => `${PRODUCT_LABELS[t.productCode]}×${t.quantity}`);
    const foodLabels = scored.foodItems.map((f) => `${f.name} ${f.portion?.portionLabel ?? ""}`.trim());
    const name = [...misuLabels, ...foodLabels].join("、") || "这一餐";
    const portion = foodLabels.join("、") || "—";
    const photoEmoji = scored.misuTags[0] ? PRODUCT_ICONS[scored.misuTags[0].productCode] : "🍽️";

    const foodItems: MealFoodItem[] = scored.foodItems
      .filter((f) => f.portion)
      .map((f) => ({
        id: f.id,
        name: f.name,
        category: f.category,
        portionLabel: f.portion!.portionLabel,
        gram: f.portion!.gram,
        calories: f.portion!.calories,
        protein: f.portion!.protein,
        carbohydrate: f.portion!.carbohydrate,
        fat: f.portion!.fat,
        fiber: f.portion!.fiber,
        isCustom: f.portion!.isCustom,
      }));

    const result = await recordMeal({
      mealId: scored.mealId,
      customerId: user.id,
      mealType: scored.mealType as never,
      misuItems: scored.misuTags,
      foodItems,
      name,
      mealTime: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      photoEmoji,
      portion,
      calories: scored.totals.calories,
      protein: scored.totals.protein,
      carbs: scored.totals.carbs,
      fat: scored.totals.fat,
      fiber: scored.totals.fiber,
      misuScore: scored.misuScore,
      goodPoints: scored.goodPoints,
      improvePoints: scored.improvePoints,
      aiAdvice: scored.aiAdvice,
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error ?? "记录失败，请重试");
      return;
    }

    sessionStorage.removeItem("misu-meal-scored");
    router.push("/customer/meals");
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="211 餐盘分析" subtitle="Smart Meal Check" backHref="/customer/meals/confirm" />

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
                  <span key={t.productCode} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    {PRODUCT_ICONS[t.productCode]} {PRODUCT_LABELS[t.productCode]} × {t.quantity}
                  </span>
                ))}
              </div>
            )}
            {scored.foodItems.length > 0 && (
              <p className="truncate text-sm text-slate-500">
                {scored.foodItems.map((f) => `${FOOD_CATEGORY_META[f.category].emoji} ${f.name} ${f.portion?.portionLabel ?? ""}`).join("、")}
              </p>
            )}
          </div>
          <div className="shrink-0 text-center">
            <p className="text-2xl leading-none text-amber-400">{starString(scored.misuScore)}</p>
            <p className="mt-1 text-[11px] text-slate-400">211 餐盘评分</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">211 比例</p>
        <div className="flex flex-col gap-2.5">
          {ratioBars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-xs text-slate-500">{bar.label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${bar.colorClass}`} style={{ width: `${Math.min(100, bar.percent)}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right text-xs font-medium text-slate-600">{bar.percent}%</span>
            </div>
          ))}
        </div>
      </div>

      {scored.goodPoints.length > 0 && (
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
      )}

      {scored.improvePoints.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700">
            <span>💡</span>可以改善的地方
          </p>
          <ul className="flex flex-col gap-1.5">
            {scored.improvePoints.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 text-amber-500">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {scored.aiAdvice && (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-sky-700">
            <span>🤖</span>AI 建议
          </p>
          <p className="text-sm leading-relaxed text-slate-600">{scored.aiAdvice}</p>
        </div>
      )}

      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={submitting || !user}
          onClick={handleComplete}
          className="rounded-xl bg-emerald-500 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
        >
          {submitting ? "记录中..." : "完成记录"}
        </button>
        <Link href="/customer/meals/add" className="rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-600 transition hover:border-slate-300">
          重新拍照
        </Link>
      </div>
    </div>
  );
}
