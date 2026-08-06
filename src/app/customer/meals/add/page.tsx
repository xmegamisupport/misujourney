"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { MealScanner } from "@/components/meals/MealScanner";
import { mealTypeOptions, mealTypeLabel } from "@/lib/meal-types";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useTodayJourneyDay } from "@/lib/journey-day/hooks";
import { todayDateStr } from "@/lib/inventory/engine";

const DEFAULT_MEAL_TYPE = "lunch";

/** Which meal this is comes from the link that opened the page — the customer
 * already answered that question by tapping a meal card on 今日饮食, and asking
 * again was the whole reason the old intermediate step existed. An unknown or
 * missing value falls back rather than blocking: a bad link should still let
 * her record something. */
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

  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const today = todayDateStr();
  const { data: todayJourney, loading: journeyLoading } = useTodayJourneyDay(customerId, today);
  const journeyActive = (todayJourney?.status ?? "waiting_for_morning") === "active";

  // Don't open the camera before the guard resolves — a flash of the Scanner
  // that then gets pulled away would prompt for camera permission needlessly.
  if (journeyLoading) {
    return <div className="px-4 py-10 md:px-8" />;
  }

  if (!journeyActive) {
    return (
      <div className="px-4 py-10 md:px-8">
        <PageHeader title={`记录${mealTypeLabel(mealType)}`} backHref="/customer/meals" />
        <EmptyState
          icon="🌱"
          title="今天的 Journey 还没开始"
          description="请先回到首页完成或跳过晨重，再来记录这一餐。"
          action={
            <Link href="/customer" className="text-sm font-semibold text-brand">
              返回首页 →
            </Link>
          }
        />
      </div>
    );
  }

  return <MealScanner mealType={mealType} />;
}
