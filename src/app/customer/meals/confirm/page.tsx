"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { PortionSelector } from "@/components/ui/PortionSelector";
import { EmptyState } from "@/components/ui/EmptyState";
import { PRODUCT_LABELS, PRODUCT_ICONS } from "@/lib/inventory/constants";
import { MISU_FIXED_NUTRITION } from "@/lib/meal-check/constants";
import { calculatePlateAnalysis } from "@/lib/meal-check/plate-analysis";
import { FOOD_CATEGORY_META, FOOD_CATEGORY_OPTIONS } from "@/lib/food-portions/constants";
import { NutritionLabelSheet } from "@/components/meals/NutritionLabelSheet";
import type { MealDetectionDraft, MealScoredDraft, MisuTagDraft, FoodItemDraft, NutritionTotals } from "@/lib/meal-check/types";
import type { ProductCode } from "@/lib/inventory/types";
import type { FoodCategory } from "@/lib/food-portions/types";

const allProductCodes: ProductCode[] = ["MISU_N_PLUS", "MISU_DX_PLUS"];

function subscribe() {
  return () => {};
}
function getSnapshot() {
  return sessionStorage.getItem("misu-meal-detection");
}
function getServerSnapshot() {
  return null;
}

export default function ConfirmMealPage() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const initial = useMemo<MealDetectionDraft | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MealDetectionDraft;
    } catch {
      return null;
    }
  }, [raw]);

  if (!initial) {
    return (
      <div className="px-4 py-10 md:px-8">
        <PageHeader title="确认这一餐" backHref="/customer/meals" />
        <EmptyState icon="📷" title="还没有分析结果" description="请先拍照并完成 AI 分析" />
      </div>
    );
  }

  return <ConfirmMealEditor initial={initial} />;
}

function ConfirmMealEditor({ initial }: { initial: MealDetectionDraft }) {
  const router = useRouter();
  const [misuTags, setMisuTags] = useState<MisuTagDraft[]>(initial.misuTags);
  const [foodItems, setFoodItems] = useState<FoodItemDraft[]>(initial.foodItems);
  const [addMisuOpen, setAddMisuOpen] = useState(false);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [addFoodName, setAddFoodName] = useState("");
  const [addFoodCategory, setAddFoodCategory] = useState<FoodCategory>("vegetable");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which item is currently having its packet label read, if any.
  const [labelItemId, setLabelItemId] = useState<string | null>(null);

  function updateMisuQuantity(productCode: ProductCode, next: number) {
    setMisuTags((prev) => {
      const existing = prev.find((t) => t.productCode === productCode);
      if (existing) {
        if (next <= 0) return prev.filter((t) => t.productCode !== productCode);
        return prev.map((t) => (t.productCode === productCode ? { ...t, quantity: next } : t));
      }
      return next > 0 ? [...prev, { productCode, quantity: next }] : prev;
    });
  }

  function removeFoodItem(id: string) {
    setFoodItems((prev) => prev.filter((f) => f.id !== id));
  }

  function renameFoodItem(id: string, name: string) {
    setFoodItems((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }

  function setFoodPortion(id: string, portion: FoodItemDraft["portion"]) {
    setFoodItems((prev) => prev.map((f) => (f.id === id ? { ...f, portion } : f)));
  }

  function addFoodItem() {
    if (!addFoodName.trim()) return;
    setFoodItems((prev) => [
      ...prev,
      {
        id: `food_${crypto.randomUUID()}`,
        name: addFoodName.trim(),
        category: addFoodCategory,
      },
    ]);
    setAddFoodName("");
    setAddFoodOpen(false);
  }

  async function handleConfirm() {
    const readyItems = foodItems.filter((f) => f.portion);
    setSubmitting(true);
    setError(null);
    try {
      const totals: NutritionTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      for (const tag of misuTags) {
        const n = MISU_FIXED_NUTRITION[tag.productCode];
        totals.calories += n.calories * tag.quantity;
        totals.protein += n.protein * tag.quantity;
        totals.carbs += n.carbs * tag.quantity;
        totals.fat += n.fat * tag.quantity;
        totals.fiber += n.fiber * tag.quantity;
      }
      for (const item of readyItems) {
        const p = item.portion!;
        totals.calories += p.calories;
        totals.protein += p.protein;
        totals.carbs += p.carbohydrate;
        totals.fat += p.fat;
        totals.fiber += p.fiber;
      }
      totals.calories = Math.round(totals.calories);
      totals.protein = Math.round(totals.protein);
      totals.carbs = Math.round(totals.carbs);
      totals.fat = Math.round(totals.fat);
      totals.fiber = Math.round(totals.fiber);

      const plateAnalysis = calculatePlateAnalysis(readyItems.map((f) => ({ category: f.category, gram: f.portion!.gram })));

      const res = await fetch("/api/score-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType: initial.mealType,
          misuItems: misuTags,
          foodItems: readyItems.map((f) => ({ name: f.name, category: f.category, portionLabel: f.portion!.portionLabel })),
          plateAnalysis: { vegetablePercent: plateAnalysis.vegetablePercent, proteinPercent: plateAnalysis.proteinPercent, carbPercent: plateAnalysis.carbPercent },
          goodPoints: plateAnalysis.goodPoints,
          improvePoints: plateAnalysis.improvePoints,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成建议失败，请重试");

      const scored: MealScoredDraft = {
        mealId: crypto.randomUUID(),
        mealType: initial.mealType,
        photo: initial.photo,
        misuTags,
        foodItems: readyItems,
        totals,
        misuScore: plateAnalysis.score,
        goodPoints: plateAnalysis.goodPoints,
        improvePoints: plateAnalysis.improvePoints,
        plateAnalysis: {
          vegetablePercent: plateAnalysis.vegetablePercent,
          proteinPercent: plateAnalysis.proteinPercent,
          carbPercent: plateAnalysis.carbPercent,
        },
        aiAdvice: typeof data.advice === "string" ? data.advice : "",
      };
      sessionStorage.setItem("misu-meal-scored", JSON.stringify(scored));
      sessionStorage.removeItem("misu-meal-detection");
      router.push("/customer/meals/result");
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "生成建议失败，请重试");
    }
  }

  const missingMisuProducts = allProductCodes.filter((code) => !misuTags.some((t) => t.productCode === code));
  const hasAnyItem = misuTags.length > 0 || foodItems.length > 0;

  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
        <p className="text-base font-semibold text-slate-800">分析 211 餐盘…</p>
        <p className="text-sm text-slate-400">正在根据确认后的份量计算营养与建议</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-28 md:px-8">
      <PageHeader title="确认这一餐" subtitle="确认食物名称，再选择生活化份量" backHref="/customer/meals" />

      {initial.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={initial.photo} alt="这一餐的照片" className="h-32 w-full rounded-2xl object-cover" />
      )}

      {misuTags.length === 0 && foodItems.length === 0 && (
        <EmptyState icon="🤔" title="AI 没有辨识到任何东西" description="可以手动添加 MISU 产品或食物" />
      )}

      {misuTags.length > 0 && (
        <div className="flex flex-col gap-2">
          {misuTags.map((tag) => (
            <div key={tag.productCode} className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <span>{PRODUCT_ICONS[tag.productCode]}</span>
                {PRODUCT_LABELS[tag.productCode]}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateMisuQuantity(tag.productCode, tag.quantity - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-base text-slate-500"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-semibold text-slate-800">{tag.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateMisuQuantity(tag.productCode, tag.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-base text-emerald-600"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {missingMisuProducts.length > 0 && !addMisuOpen && (
        <button
          type="button"
          onClick={() => setAddMisuOpen(true)}
          className="rounded-2xl border border-dashed border-emerald-200 py-2.5 text-center text-sm font-medium text-emerald-600 transition hover:bg-emerald-50"
        >
          + 添加 MISU 产品
        </button>
      )}
      {addMisuOpen && (
        <div className="flex gap-2">
          {missingMisuProducts.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                updateMisuQuantity(code, 1);
                setAddMisuOpen(false);
              }}
              className="flex-1 rounded-2xl border border-emerald-200 bg-emerald-50/60 py-2.5 text-center text-sm font-medium text-emerald-700 transition hover:border-emerald-300"
            >
              {PRODUCT_ICONS[code]} {PRODUCT_LABELS[code]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAddMisuOpen(false)}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500"
          >
            取消
          </button>
        </div>
      )}

      {foodItems.length > 0 && (
        <div className="flex flex-col gap-3">
          {foodItems.map((item) => (
            <div key={item.id} className="flex flex-col gap-2.5 rounded-2xl border border-slate-100 bg-white p-3.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{FOOD_CATEGORY_META[item.category].emoji}</span>
                <input
                  value={item.name}
                  onChange={(e) => renameFoodItem(item.id, e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-transparent px-1.5 py-1 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-emerald-50/40"
                />
                <button
                  type="button"
                  onClick={() => removeFoodItem(item.id)}
                  aria-label={`删除${item.name}`}
                  className="shrink-0 rounded-full px-2 py-1 text-xs text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                >
                  删除
                </button>
              </div>
              {/* A portion read off the packet is already exact, so the
                  life-style picker would only be able to make it worse. Show
                  one or the other, never both. */}
              {item.portion?.isCustom ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
                  <span className="text-sm">📋</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-emerald-700">
                      {item.portion.portionLabel} · {item.portion.calories} kcal
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">来自包装上的营养标签</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFoodPortion(item.id, undefined)}
                    className="shrink-0 text-[11px] font-medium text-slate-400"
                  >
                    改回估算
                  </button>
                </div>
              ) : (
                <>
                  <PortionSelector category={item.category} selected={item.portion} onChange={(portion) => setFoodPortion(item.id, portion)} />
                  <button
                    type="button"
                    onClick={() => setLabelItemId(item.id)}
                    className="rounded-xl border border-dashed border-emerald-200 py-2 text-center text-xs font-medium text-emerald-600 transition hover:bg-emerald-50/60"
                  >
                    📋 有包装？拍营养标签更准
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {labelItemId &&
        (() => {
          const item = foodItems.find((f) => f.id === labelItemId);
          if (!item) return null;
          return (
            <NutritionLabelSheet
              foodName={item.name}
              category={item.category}
              onClose={() => setLabelItemId(null)}
              onApply={(portion, productName) => {
                setFoodPortion(item.id, portion);
                // The name printed on the packet beats the model's guess from
                // across the table — "Monster Snek Mi" rather than "脆脆面零食".
                // She can still edit it; the field stays editable.
                if (productName) renameFoodItem(item.id, productName);
                setLabelItemId(null);
              }}
            />
          );
        })()}

      {!addFoodOpen ? (
        <button
          type="button"
          onClick={() => setAddFoodOpen(true)}
          className="rounded-2xl border border-dashed border-slate-200 py-2.5 text-center text-sm font-medium text-slate-500 transition hover:bg-slate-50"
        >
          + 新增食物
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3.5">
          <input
            autoFocus
            value={addFoodName}
            onChange={(e) => setAddFoodName(e.target.value)}
            placeholder="食物名称，例如 地瓜叶"
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <select
            value={addFoodCategory}
            onChange={(e) => setAddFoodCategory(e.target.value as FoodCategory)}
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            {FOOD_CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>
                {FOOD_CATEGORY_META[cat].emoji} {FOOD_CATEGORY_META[cat].label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addFoodItem}
              className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              添加
            </button>
            <button
              type="button"
              onClick={() => setAddFoodOpen(false)}
              className="rounded-xl border border-slate-200 px-4 text-sm text-slate-500"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-lg border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:static md:rounded-2xl md:border md:shadow-sm">
        <button
          type="button"
          disabled={!hasAnyItem}
          onClick={handleConfirm}
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          确认，生成 211 分析
        </button>
      </div>
    </div>
  );
}
