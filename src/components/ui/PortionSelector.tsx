"use client";

import { useEffect, useState } from "react";
import { usePortionOptions } from "@/lib/food-portions/hooks";
import { buildCustomPortion, toSelectedPortion } from "@/lib/food-portions/engine";
import { FOOD_CATEGORY_META } from "@/lib/food-portions/constants";
import type { FoodCategory, FoodPortionOption, SelectedPortion } from "@/lib/food-portions/types";
import { cn } from "@/lib/utils";

interface PortionSelectorProps {
  category: FoodCategory;
  selected?: SelectedPortion;
  onChange: (portion: SelectedPortion) => void;
}

/** Life-style portion picker ("半碗"/"一碗"/...) — the customer never sees a
 * gram number here, only the labels from the food_portions catalog. */
export function PortionSelector({ category, selected, onChange }: PortionSelectorProps) {
  const { data: options, loading } = usePortionOptions(category);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("1");

  useEffect(() => {
    if (!loading && options.length > 0 && !selected) {
      const base = options.find((o) => o.isBaseUnit) ?? options[0];
      onChange(toSelectedPortion(base));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, options, selected]);

  if (loading) {
    return <div className="h-9 w-full animate-pulse rounded-full bg-slate-100" />;
  }

  function selectOption(option: FoodPortionOption) {
    setCustomOpen(false);
    onChange(toSelectedPortion(option));
  }

  function applyCustom() {
    const multiplier = Number(customValue);
    if (!Number.isFinite(multiplier) || multiplier <= 0) return;
    const portion = buildCustomPortion(options, multiplier);
    if (portion) onChange(portion);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((option) => {
        const active = !selected?.isCustom && selected?.portionLabel === option.portionLabel;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => selectOption(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500",
            )}
          >
            {option.portionLabel}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setCustomOpen((v) => !v)}
        className={cn(
          "rounded-full border px-3 py-1.5 text-xs font-medium transition",
          customOpen || selected?.isCustom
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-dashed border-slate-200 text-slate-500",
        )}
      >
        其他{selected?.isCustom ? `：${selected.portionLabel}` : ""}
      </button>
      {customOpen && (
        <div className="flex w-full items-center gap-2 pt-1">
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <span className="text-xs text-slate-500">{FOOD_CATEGORY_META[category].unitName}</span>
          <button
            type="button"
            onClick={applyCustom}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
          >
            确定
          </button>
        </div>
      )}
    </div>
  );
}
