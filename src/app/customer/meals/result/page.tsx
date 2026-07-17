"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { recordMeal } from "@/lib/inventory/engine";
import { PRODUCT_LABELS, PRODUCT_ICONS } from "@/lib/inventory/constants";
import { starString, buildPlateGroupChecks, plateBalanceTier } from "@/lib/meal-check/plate-analysis";
import { FOOD_CATEGORY_META } from "@/lib/food-portions/constants";
import { cn } from "@/lib/utils";
import type { MealScoredDraft } from "@/lib/meal-check/types";
import type { MealFoodItem } from "@/lib/types";
import type { PlateGroupStatus } from "@/lib/meal-check/plate-analysis";

const STATUS_ICON: Record<PlateGroupStatus, string> = { good: "🟢", high: "🟡", low: "🔴" };
const STATUS_COLOR: Record<PlateGroupStatus, string> = { good: "text-emerald-600", high: "text-amber-600", low: "text-rose-600" };

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

  const tier = plateBalanceTier(scored.misuScore);
  const groupChecks = buildPlateGroupChecks(scored.plateAnalysis);

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
    // Dashboard is home: a completed task returns the customer to their home
    // base (where 今日营养 now reflects this meal), not deeper into the module.
    router.push("/customer");
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="211 餐盘分析" subtitle="Smart Meal Check" backHref="/customer/meals/confirm" />

      {/* Card 1 — 照片 + 已辨识食物（不显示克数） */}
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {scored.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scored.photo} alt="这一餐的照片" className="h-40 w-full object-cover" />
        ) : (
          <div className="flex items-center justify-center bg-emerald-50 py-8 text-6xl">🍽️</div>
        )}
        <div className="p-5">
          <p className="mb-2 text-sm font-semibold text-slate-700">已辨识食物</p>
          <div className="flex flex-col gap-1.5">
            {scored.misuTags.map((t) => (
              <p key={t.productCode} className="text-sm text-slate-600">
                {PRODUCT_ICONS[t.productCode]} {PRODUCT_LABELS[t.productCode]}（× {t.quantity}）
              </p>
            ))}
            {scored.foodItems.map((f) => (
              <p key={f.id} className="text-sm text-slate-600">
                {FOOD_CATEGORY_META[f.category].emoji} {f.name}（{f.portion?.portionLabel ?? ""}）
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Card 2 — 餐盘平衡度：星级 + 一句话，取代百分比 */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">餐盘平衡度</p>
        <p className="text-3xl leading-none text-amber-400">{starString(scored.misuScore)}</p>
        <p className={cn("mt-2 text-base font-semibold", tier.colorClass)}>{tier.label}</p>
        <p className="mt-1 text-sm text-slate-500">{tier.message}</p>
      </div>

      {/* Card 3 — 211 餐盘检查：状态 + 行动建议，取代百分比 */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-700">211 餐盘检查</p>
        <div className="flex flex-col divide-y divide-slate-100">
          {groupChecks.map((check) => (
            <div key={check.group} className="flex items-center justify-between gap-3 py-3 first:pt-2 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{check.emoji}</span>
                <span className="text-sm font-medium text-slate-700">{check.label}</span>
              </div>
              <div className="text-right">
                <p className={cn("text-sm font-semibold", STATUS_COLOR[check.status])}>
                  {STATUS_ICON[check.status]} {check.statusLabel}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{check.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card 4 — 做得好的地方（最多 3 项） */}
      {scored.goodPoints.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <span>✅</span>做得好的地方
          </p>
          <ul className="flex flex-col gap-1.5">
            {scored.goodPoints.slice(0, 3).map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 text-emerald-500">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Card 5 — 下一餐建议（AI，最多 3 句） */}
      {scored.aiAdvice && (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-sky-700">
            <span>🤖</span>下一餐建议
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
