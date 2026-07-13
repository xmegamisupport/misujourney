"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCustomers } from "@/lib/coach/hooks";
import { useCheckInsForCustomers, useTodayMealsForCustomers } from "@/lib/inventory/hooks";
import { useCheckoutsForCustomers } from "@/lib/checkout/hooks";
import { useAttentionFlagsForCustomers, useLatestInsightsForCustomers } from "@/lib/insights/hooks";
import { SEVERITY_STYLES } from "@/lib/insights/constants";
import { useGoalsForCustomers } from "@/lib/goals/hooks";
import { useNutritionTargetsForCustomers } from "@/lib/nutrition/hooks";
import { useWaterLogsForCustomers } from "@/lib/daily-progress";
import { countVegetableServings, VEGETABLE_SERVINGS_TARGET } from "@/lib/meal-check/plate-analysis";
import { cn } from "@/lib/utils";

const filters = [
  { key: "all", label: "全部" },
  { key: "attention", label: "需要关注" },
  { key: "no_checkout_today", label: "今日未回顾" },
];

function daysAgoDateStr(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export default function CustomerListPage() {
  const { user } = useAuthUser();
  const coachId = user?.id ?? "";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: customers } = useMyCustomers(coachId);
  const customerIds = useMemo(() => customers.map((c) => c.id), [customers]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const weekAgo = useMemo(() => daysAgoDateStr(6), []);

  const { data: checkInMap } = useCheckInsForCustomers(customerIds);
  const { data: checkoutMap } = useCheckoutsForCustomers(customerIds, weekAgo, today);
  const { data: flagsMap } = useAttentionFlagsForCustomers(customerIds);
  const { data: insightMap } = useLatestInsightsForCustomers(customerIds, "weekly_7_day");
  const { data: goalMap } = useGoalsForCustomers(customerIds);
  const { data: nutritionTargetMap } = useNutritionTargetsForCustomers(customerIds);
  const { data: todayMealsMap } = useTodayMealsForCustomers(customerIds);
  const { data: waterMap } = useWaterLogsForCustomers(customerIds, today);

  const rows = useMemo(() => {
    return customers
      .filter((c) => c.name.includes(query))
      .map((c) => {
        const checkIns = [...(checkInMap[c.id] ?? [])].sort((a, b) => b.date.localeCompare(a.date));
        const latestWeight = checkIns[0]?.weight ?? null;
        const weekCheckIns = checkIns.filter((ci) => ci.date >= weekAgo);
        const oldestInWeek = weekCheckIns[weekCheckIns.length - 1];
        const weightChange = latestWeight !== null && oldestInWeek && weekCheckIns.length >= 2 ? Math.round((latestWeight - oldestInWeek.weight) * 10) / 10 : null;
        const checkoutDays = (checkoutMap[c.id] ?? []).length;
        const flags = flagsMap[c.id] ?? [];
        const insight = insightMap[c.id];
        const checkedOutToday = (checkoutMap[c.id] ?? []).some((co) => co.checkoutDate === today);
        const todayMeals = todayMealsMap[c.id] ?? [];
        const nutrition = {
          calories: todayMeals.reduce((sum, m) => sum + m.calories, 0),
          protein: todayMeals.reduce((sum, m) => sum + m.protein, 0),
          vegServings: countVegetableServings(todayMeals),
          water: waterMap[c.id] ?? 0,
          target: nutritionTargetMap[c.id],
          waterTarget: goalMap[c.id]?.waterTargetMl ?? null,
        };
        return { customer: c, latestWeight, weightChange, checkoutDays, flags, insight, checkedOutToday, nutrition };
      })
      .filter((row) => {
        if (filter === "attention") return row.flags.length > 0;
        if (filter === "no_checkout_today") return !row.checkedOutToday;
        return true;
      });
  }, [customers, query, filter, checkInMap, checkoutMap, flagsMap, insightMap, todayMealsMap, waterMap, nutritionTargetMap, goalMap, weekAgo, today]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="我的顾客" subtitle={`共 ${customers.length} 位顾客`} />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索顾客姓名"
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              filter === f.key ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="🔍" title="没有找到符合条件的顾客" />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ customer, latestWeight, weightChange, checkoutDays, flags, insight, nutrition }) => (
            <Link
              key={customer.id}
              href={`/coach/customers/${customer.id}`}
              className="flex flex-col gap-2.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xl">{customer.avatar ?? "🙂"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{customer.name}</p>
                  <p className="text-xs text-slate-400">
                    最近晨重 {latestWeight !== null ? `${latestWeight}kg` : "暂无记录"}
                    {weightChange !== null && ` · 近7天 ${weightChange >= 0 ? "+" : ""}${weightChange}kg`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-700">{checkoutDays}/7</p>
                  <p className="text-[11px] text-slate-400">睡前回顾</p>
                </div>
              </div>

              {nutrition.target && (
                <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-slate-50 px-2 py-2 text-center">
                  <div>
                    <p className="text-[11px] text-slate-400">🔥 热量</p>
                    <p className="text-xs font-semibold text-slate-700">
                      {nutrition.calories}/{nutrition.target.dailyCalories}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">🥩 蛋白质</p>
                    <p className="text-xs font-semibold text-slate-700">
                      {nutrition.protein}/{nutrition.target.dailyProtein}g
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">🥬 蔬菜</p>
                    <p className="text-xs font-semibold text-slate-700">
                      {nutrition.vegServings}/{VEGETABLE_SERVINGS_TARGET}份
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">💧 饮水</p>
                    <p className="text-xs font-semibold text-slate-700">{nutrition.waterTarget !== null ? `${nutrition.water}/${nutrition.waterTarget}ml` : `${nutrition.water}ml`}</p>
                  </div>
                </div>
              )}

              {flags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {flags.map((flag) => (
                    <span key={flag.id} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", SEVERITY_STYLES[flag.severity])}>
                      {flag.flagLabel}
                    </span>
                  ))}
                </div>
              )}

              <p className="truncate text-xs text-slate-500">{insight ? insight.summary : "暂无 AI 摘要，点击查看详情生成"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
