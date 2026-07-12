"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuantityStepperTag } from "@/components/ui/QuantityStepperTag";
import { EmptyState } from "@/components/ui/EmptyState";
import { PRODUCT_LABELS, PRODUCT_ICONS } from "@/lib/inventory/constants";
import { MISU_FIXED_NUTRITION, MANUAL_ADD_ESTIMATE } from "@/lib/meal-check/constants";
import type { MealDetectionDraft, MealScoredDraft, MisuTagDraft, FoodItemDraft, NutritionTotals } from "@/lib/meal-check/types";
import type { ProductCode } from "@/lib/inventory/types";

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
        <PageHeader title="确认这一餐" backHref="/customer/meals/add" />
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals: NutritionTotals = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    for (const tag of misuTags) {
      const n = MISU_FIXED_NUTRITION[tag.productCode];
      calories += n.calories * tag.quantity;
      protein += n.protein * tag.quantity;
      carbs += n.carbs * tag.quantity;
      fat += n.fat * tag.quantity;
      fiber += n.fiber * tag.quantity;
    }
    for (const item of foodItems) {
      calories += item.caloriesPerUnit * item.quantity;
      protein += item.proteinPerUnit * item.quantity;
      carbs += item.carbsPerUnit * item.quantity;
      fat += item.fatPerUnit * item.quantity;
      fiber += item.fiberPerUnit * item.quantity;
    }
    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: Math.round(fiber),
    };
  }, [misuTags, foodItems]);

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

  function updateFoodQuantity(id: string, next: number) {
    setFoodItems((prev) => (next <= 0 ? prev.filter((f) => f.id !== id) : prev.map((f) => (f.id === id ? { ...f, quantity: next } : f))));
  }

  function addFoodItem() {
    if (!addFoodName.trim()) return;
    setFoodItems((prev) => [
      ...prev,
      {
        id: `food_${crypto.randomUUID()}`,
        name: addFoodName.trim(),
        servingLabel: "1份",
        quantity: 1,
        ...MANUAL_ADD_ESTIMATE,
        estimated: true,
      },
    ]);
    setAddFoodName("");
    setAddFoodOpen(false);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/score-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType: initial.mealType,
          misuItems: misuTags,
          foodItems: foodItems.map((f) => ({ name: f.name, servingLabel: f.servingLabel, quantity: f.quantity })),
          totals,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成评分失败，请重试");

      const scored: MealScoredDraft = {
        mealId: `meal_${crypto.randomUUID()}`,
        mealType: initial.mealType,
        photo: initial.photo,
        misuTags,
        foodItems,
        totals,
        misuScore: data.misuScore,
        goodPoints: Array.isArray(data.goodPoints) ? data.goodPoints.slice(0, 3) : [],
        improvePoints: Array.isArray(data.improvePoints) ? data.improvePoints.slice(0, 3) : [],
      };
      sessionStorage.setItem("misu-meal-scored", JSON.stringify(scored));
      sessionStorage.removeItem("misu-meal-detection");
      router.push("/customer/meals/result");
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "生成评分失败，请重试");
    }
  }

  const missingMisuProducts = allProductCodes.filter((code) => !misuTags.some((t) => t.productCode === code));
  const hasAnyItem = misuTags.length > 0 || foodItems.length > 0;

  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
        <p className="text-base font-semibold text-slate-800">生成 MISU Meal Score…</p>
        <p className="text-sm text-slate-400">正在根据确认后的内容计算评分与建议</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-28 md:px-8">
      <PageHeader title="确认这一餐" subtitle="AI 辨识到以下项目，数量不对可以直接调整" backHref="/customer/meals/add" />

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
            <QuantityStepperTag
              key={tag.productCode}
              icon={PRODUCT_ICONS[tag.productCode]}
              label={PRODUCT_LABELS[tag.productCode]}
              quantity={tag.quantity}
              onChange={(next) => updateMisuQuantity(tag.productCode, next)}
              accent
            />
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
        <div className="flex flex-col gap-2">
          {foodItems.map((item) => (
            <QuantityStepperTag
              key={item.id}
              label={item.name}
              sublabel={item.servingLabel}
              quantity={item.quantity}
              onChange={(next) => updateFoodQuantity(item.id, next)}
              badge={item.estimated ? "预估" : undefined}
            />
          ))}
        </div>
      )}

      {!addFoodOpen ? (
        <button
          type="button"
          onClick={() => setAddFoodOpen(true)}
          className="rounded-2xl border border-dashed border-slate-200 py-2.5 text-center text-sm font-medium text-slate-500 transition hover:bg-slate-50"
        >
          + 新增食物
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            autoFocus
            value={addFoodName}
            onChange={(e) => setAddFoodName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addFoodItem();
            }}
            placeholder="食物名称，例如 Greek Yogurt"
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={addFoodItem}
            className="shrink-0 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            添加
          </button>
        </div>
      )}

      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-lg border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:static md:rounded-2xl md:border md:shadow-sm">
        <div className="mb-3 flex justify-between text-xs text-slate-600">
          <span>
            Calories <b className="font-semibold text-slate-800">{totals.calories}</b>
          </span>
          <span>
            Protein <b className="font-semibold text-slate-800">{totals.protein}</b>g
          </span>
          <span>
            Carb <b className="font-semibold text-slate-800">{totals.carbs}</b>g
          </span>
          <span>
            Fat <b className="font-semibold text-slate-800">{totals.fat}</b>g
          </span>
          <span>
            Fiber <b className="font-semibold text-slate-800">{totals.fiber}</b>g
          </span>
        </div>
        <button
          type="button"
          disabled={!hasAnyItem}
          onClick={handleConfirm}
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          确认，生成营养分析
        </button>
      </div>
    </div>
  );
}
