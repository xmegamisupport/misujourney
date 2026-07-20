"use client";

import { useRef, useState } from "react";
import { compressPhoto } from "@/lib/image-compress";
import { amountLabel, gramsForChoice, nutrientsForGrams } from "@/lib/nutrition-label/verify";
import { savePackagedFood } from "@/lib/nutrition-label/engine";
import type { LabelAmountChoice, NutritionLabelReading } from "@/lib/nutrition-label/types";
import type { SelectedPortion } from "@/lib/food-portions/types";
import type { FoodCategory } from "@/lib/food-portions/types";

/** 📋 有包装的食物，读它的营养标签。
 *
 * The lookup table is right for a plate of home-cooked food and wrong for a
 * packet: a 20g snack came out at 206kcal because "脆脆面" was matched to
 * "一碗面" — 7.5x too much food at a third of the real density. For anything
 * with a printed panel, the manufacturer's own measurement beats any table we
 * could build, so this path skips the table entirely.
 *
 * Two questions, deliberately separate: what does the packet say, and how much
 * of it did you eat. Reading the label perfectly and then assuming she ate a
 * serving — when a share bag holds 25 of them — would throw the accuracy away
 * at the last step. */
export function NutritionLabelSheet({
  foodName,
  category,
  onApply,
  onClose,
}: {
  foodName: string;
  category: FoodCategory;
  onApply: (portion: SelectedPortion, productName: string) => void;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<NutritionLabelReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<LabelAmountChoice>("package");
  const [customGram, setCustomGram] = useState("");

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const { blob } = await compressPhoto(file);
      const formData = new FormData();
      formData.append("photo", blob, "label.jpg");
      const res = await fetch("/api/read-nutrition-label", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "读取失败，请重试");
      setReading(data as NutritionLabelReading);
      // A single-serving packet is the common case for snacks, so "整包" is the
      // most likely answer — but it stays a choice, never an assumption.
      setChoice("package");
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  const gram = reading ? gramsForChoice(reading, choice, Number(customGram)) : null;
  const nutrients = reading && gram ? nutrientsForGrams(reading, gram) : null;

  async function handleApply() {
    if (!reading || !gram || !nutrients) return;
    // Fire and forget: the shared product library is a by-product, and a failed
    // insert must never block her from recording what she ate.
    void savePackagedFood(reading);
    onApply(
      {
        category,
        portionLabel: amountLabel(reading, choice, gram),
        gram: Math.round(gram),
        calories: nutrients.calories,
        protein: nutrients.protein,
        carbohydrate: nutrients.carbohydrate,
        fat: nutrients.fat,
        fiber: nutrients.fiber,
        isCustom: true,
      },
      reading.productName || foodName,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-3 pb-3">
      <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">📋 读取营养标签</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{foodName}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full px-2 py-1 text-xs text-slate-400">
            关闭
          </button>
        </div>

        {!reading ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 text-emerald-600 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-500" />
                  <span className="text-sm font-medium">读取中…</span>
                </>
              ) : (
                <>
                  {/* Camera, not a document: the icon on an action should show
                      what pressing it does, not what it is about. 📋 stays on
                      the heading and on the applied result, which describe the
                      label rather than ask her to take a photo of it. */}
                  <span className="text-4xl">📷</span>
                  <span className="text-sm font-medium">拍营养成分表</span>
                </>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
              请把整个「营养资料 / Nutrition Information」表格拍清楚，包含每份重量那一行。包装上印的数字，比我们的估算准得多。
            </p>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-3">
              <p className="text-sm font-semibold text-slate-800">
                {reading.brand ? `${reading.brand} ` : ""}
                {reading.productName || foodName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                每份 {reading.servingSizeG}g · 每包 {reading.servingsPerPackage} 份 · 每 100g {reading.per100g.calories} kcal
              </p>
            </div>

            <p className="mb-2 mt-4 text-sm font-medium text-slate-600">你吃了多少？</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: "package" as const, label: "整包" },
                  { key: "half_package" as const, label: "半包" },
                  { key: "serving" as const, label: "一份" },
                ] satisfies { key: LabelAmountChoice; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setChoice(opt.key)}
                  className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                    choice === opt.key ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChoice("custom")}
                className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  choice === "custom" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"
                }`}
              >
                自订
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={customGram}
                onChange={(e) => {
                  setCustomGram(e.target.value);
                  setChoice("custom");
                }}
                placeholder="公克"
                className="w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            {nutrients && gram ? (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  {nutrients.calories} kcal
                  <span className="ml-1.5 text-xs font-normal text-slate-400">/ {Math.round(gram)}g</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  蛋白质 {nutrients.protein}g · 碳水 {nutrients.carbohydrate}g · 脂肪 {nutrients.fat}g · 纤维 {nutrients.fiber}g
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400">请输入你吃了多少公克。</p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={!nutrients}
                onClick={handleApply}
                className="rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400"
              >
                使用这份数据
              </button>
              <button
                type="button"
                onClick={() => {
                  setReading(null);
                  setError(null);
                }}
                className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-500"
              >
                📷 重新拍标签
              </button>
            </div>
          </>
        )}

        {error && <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-xs leading-relaxed text-rose-600">{error}</div>}
      </div>
    </div>
  );
}
