"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MealScanner } from "@/components/meals/MealScanner";
import { mealTypeOptions } from "@/lib/meal-types";

const DEFAULT_MEAL_TYPE = "lunch";

/** Which meal this is comes from the link that opened the page — the customer
 * already answered that question by tapping a meal card on 今日饮食. An unknown
 * or missing value falls back rather than blocking. */
function resolveMealType(raw: string | null): string {
  return mealTypeOptions.some((t) => t.key === raw) ? (raw as string) : DEFAULT_MEAL_TYPE;
}

export default function AddMealPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 md:px-8" />}>
      <AddMealForm />
    </Suspense>
  );
}

function AddMealForm() {
  const searchParams = useSearchParams();
  const mealType = resolveMealType(searchParams.get("type"));

  // 饮食打卡是全天可记的习惯 — no morning-check-in gate here anymore. The Scanner
  // opens directly; recording is allowed server-side without an active Journey Day.
  return <MealScanner mealType={mealType} />;
}
