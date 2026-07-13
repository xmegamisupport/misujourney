"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { NutritionCard } from "@/components/ui/NutritionCard";
import { ScoreCircle } from "@/components/ui/ScoreCircle";
import { TrendChart } from "@/components/ui/TrendChart";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { addWater, useWaterIntake } from "@/lib/daily-progress";
import { useCustomerInventory, useHasInventoryRecords, useCustomerTransactions, useTodayMeals, useTodayCheckIn, useCustomerCheckIns } from "@/lib/inventory/hooks";
import { calcAverageDailyUsage, calcEstimatedDaysRemaining, todayDateStr } from "@/lib/inventory/engine";
import { InventoryStatusCard } from "@/components/inventory/InventoryStatusCard";
import { useCurrentCustomerGoal } from "@/lib/goals/hooks";
import type { ProductCode } from "@/lib/inventory/types";
import type { TrendPoint } from "@/lib/types";

const waterPresets = [100, 200, 350, 500];
const inventoryProducts: ProductCode[] = ["MISU_N_PLUS", "MISU_DX_PLUS"];
const DEFAULT_WATER_TARGET_ML = 2000;
const DEFAULT_NUTRITION_TARGETS = { calories: 1500, protein: 90, fiber: 25 };

export default function CustomerDashboardPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: journey } = useJourneySummary(customerId);
  const { data: addedMeals } = useTodayMeals(customerId);
  const addedCalories = addedMeals.reduce((sum, m) => sum + m.calories, 0);
  const addedProtein = addedMeals.reduce((sum, m) => sum + m.protein, 0);
  const addedFiber = addedMeals.reduce((sum, m) => sum + m.fiber, 0);

  const water = useWaterIntake(customerId, 0, DEFAULT_WATER_TARGET_ML);
  const [customWater, setCustomWater] = useState("");

  const { data: hasInventory } = useHasInventoryRecords(customerId);
  const { data: inventoryRows } = useCustomerInventory(customerId);
  const { data: transactions } = useCustomerTransactions(customerId);
  const { data: currentGoal } = useCurrentCustomerGoal(customerId);
  const { data: todayCheckIn } = useTodayCheckIn(customerId);
  const { data: checkIns } = useCustomerCheckIns(customerId);

  const today = todayDateStr();
  const journeyProgress = [
    { label: "今日打卡", icon: "✅", done: Boolean(todayCheckIn) },
    { label: "今日211餐盘", icon: "🥗", done: addedMeals.length > 0 },
    { label: "今日饮水", icon: "💧", done: water >= DEFAULT_WATER_TARGET_ML },
    { label: "今日运动", icon: "🏃", done: false },
    { label: "MISU产品", icon: "🥤", done: transactions.some((t) => t.createdAt.slice(0, 10) === today && (t.type === "MEAL_USAGE" || t.type === "CHECK_IN_USAGE")) },
  ];
  const journeyProgressPercent = Math.round((journeyProgress.filter((i) => i.done).length / journeyProgress.length) * 100);

  const latestWeight = checkIns[0]?.weight ?? null;
  const displayWeight = latestWeight ?? journey?.startWeight ?? null;
  const weightTrendData: TrendPoint[] = [...checkIns].reverse().map((ci) => ({ label: ci.date.slice(5), value: ci.weight }));
  const currentDay = journey?.currentDay ?? 1;
  const planLength = journey?.planLength ?? 30;
  const hasWeightGoal = Boolean(currentGoal) && currentGoal!.stageGoalWeightMin < currentGoal!.baseWeightKg;
  const remaining = hasWeightGoal && latestWeight !== null
    ? {
        min: Math.max(0, Math.round((latestWeight - currentGoal!.stageGoalWeightMax) * 10) / 10),
        max: Math.max(0, Math.round((latestWeight - currentGoal!.stageGoalWeightMin) * 10) / 10),
      }
    : null;
  const goalReached = remaining !== null && remaining.max <= 0;

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 md:px-8">
      <PageHeader
        title={`早安，${journey?.name ?? ""} ${journey?.avatar ?? ""}`}
        subtitle={`Day ${currentDay} / ${planLength} · Every Day Is A New Journey`}
        action={
          <Link
            href="/customer/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xl"
          >
            {journey?.avatar ?? "🙂"}
          </Link>
        }
      />

      <div className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-sky-50 p-5">
        <ScoreCircle value={journeyProgressPercent} label="今日进度" colorClass="text-emerald-500" trackClass="text-white/70" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-700">
              🔥 连续打卡 {journey?.streakDays ?? 0} 天
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${Math.round((currentDay / planLength) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">计划进度 {Math.round((currentDay / planLength) * 100)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="连续打卡" value={journey?.streakDays ?? 0} unit="天" icon="🔥" accent="bg-amber-50 text-amber-600" />
        <StatCard label="当前体重" value={displayWeight ?? "—"} unit={displayWeight !== null ? "kg" : undefined} icon="⚖️" accent="bg-sky-50 text-sky-600" />
      </div>

      {currentGoal && (
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">🎯 第一阶段目标</p>
          {!hasWeightGoal ? (
            <p className="text-sm text-slate-500">目前专注在习惯养成，暂无体重目标。每一个阶段完成以后，再重新评估下一阶段目标。</p>
          ) : (
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">目前体重</p>
                <p className="text-lg font-semibold text-slate-900">{currentGoal.baseWeightKg}kg</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">第一阶段目标</p>
                <p className="text-lg font-semibold text-slate-900">
                  {currentGoal.stageGoalWeightMin === currentGoal.stageGoalWeightMax
                    ? `${currentGoal.stageGoalWeightMin}`
                    : `${currentGoal.stageGoalWeightMin} ~ ${currentGoal.stageGoalWeightMax}`}
                  kg
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">目前进度</p>
                <p className="text-lg font-semibold text-emerald-600">{latestWeight !== null ? `${latestWeight}kg` : "尚未打卡"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">距离建议目标</p>
                <p className="text-lg font-semibold text-slate-900">
                  {goalReached
                    ? "🎉 已达成"
                    : remaining
                      ? `还有 ${remaining.min === remaining.max ? remaining.min : `${remaining.min} ~ ${remaining.max}`}kg`
                      : "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Today&apos;s Progress</p>
          <p className="text-2xl font-semibold text-emerald-600">{journeyProgressPercent}%</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {journeyProgress.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span>{item.done ? "✅" : "⬜"}</span>
              <span className={item.done ? "text-slate-700" : "text-slate-400"}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">我的产品库存</p>
        {hasInventory ? (
          <div className="grid grid-cols-2 gap-3">
            {inventoryProducts.map((productCode) => {
              const row = inventoryRows.find((r) => r.productCode === productCode);
              const avgDailyUsage = calcAverageDailyUsage(transactions, productCode);
              const estimatedDaysRemaining = calcEstimatedDaysRemaining(row?.remainingUnits ?? 0, avgDailyUsage);
              return (
                <InventoryStatusCard
                  key={productCode}
                  productCode={productCode}
                  remainingUnits={row?.remainingUnits ?? 0}
                  totalUsedUnits={row?.totalUsedUnits ?? 0}
                  estimatedDaysRemaining={estimatedDaysRemaining}
                />
              );
            })}
          </div>
        ) : (
          <Link
            href="/customer/checkin"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-4 transition hover:border-amber-300"
          >
            <span className="text-2xl">📦</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">请先更新你的 MISU 产品库存</p>
              <p className="text-xs text-slate-500">填写目前剩余包数，开始追踪库存 →</p>
            </div>
          </Link>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">今日营养</p>
        <div className="grid grid-cols-3 gap-3">
          <NutritionCard
            label="热量"
            value={addedCalories}
            target={DEFAULT_NUTRITION_TARGETS.calories}
            unit="kcal"
            icon="🔥"
            color="bg-amber-400"
          />
          <NutritionCard
            label="蛋白质"
            value={addedProtein}
            target={DEFAULT_NUTRITION_TARGETS.protein}
            unit="g"
            icon="🥚"
            color="bg-sky-400"
          />
          <NutritionCard
            label="纤维"
            value={addedFiber}
            target={DEFAULT_NUTRITION_TARGETS.fiber}
            unit="g"
            icon="🥦"
            color="bg-emerald-400"
          />
        </div>
      </div>

      <Link
        href="/customer/meals/add"
        className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-300"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-xl">📷</span>
        <div>
          <p className="text-sm font-semibold text-slate-800">拍照记录食物</p>
          <p className="text-xs text-slate-400">AI 智能识别</p>
        </div>
      </Link>

      <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xl">💧</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">今天喝水量</p>
            <p className="text-xs text-slate-400">
              今日 {water} / {DEFAULT_WATER_TARGET_ML}ml
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sky-50">
          <div
            className="h-full rounded-full bg-sky-400 transition-all"
            style={{ width: `${Math.round((water / DEFAULT_WATER_TARGET_ML) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {waterPresets.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => addWater(customerId, amount, 0, DEFAULT_WATER_TARGET_ML)}
              className="rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-medium text-sky-700 transition hover:border-sky-300 active:scale-95"
            >
              +{amount}ml
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={customWater}
            onChange={(e) => setCustomWater(e.target.value)}
            placeholder="自定义 ml"
            className="w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="button"
            onClick={() => {
              const amount = Number(customWater);
              if (amount > 0) {
                addWater(customerId, amount, 0, DEFAULT_WATER_TARGET_ML);
                setCustomWater("");
              }
            }}
            className="shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            添加
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/customer/checkin"
          className="flex items-center gap-3 rounded-2xl bg-emerald-500 p-4 text-white shadow-sm transition hover:bg-emerald-600"
        >
          <span className="text-xl">⚖️</span>
          <div>
            <p className="text-sm font-semibold">每日体重打卡</p>
            <p className="text-xs text-emerald-50">记录体重与状态</p>
          </div>
        </Link>
        <Link
          href="/customer/learn"
          className="flex items-center gap-3 rounded-2xl bg-sky-500 p-4 text-white shadow-sm transition hover:bg-sky-600"
        >
          <span className="text-xl">📚</span>
          <div>
            <p className="text-sm font-semibold">今日学习</p>
            <p className="text-xs text-sky-50">继续你的学习进度 →</p>
          </div>
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">体重趋势</p>
          <Link href="/customer/progress" className="text-xs font-medium text-emerald-600">
            查看完整进度 →
          </Link>
        </div>
        {weightTrendData.length > 0 ? (
          <TrendChart data={weightTrendData} unit="kg" strokeClass="text-emerald-500" fillId="dash-weight" />
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">还没有体重记录，完成第一次打卡后开始记录趋势</p>
        )}
      </div>

      <Link
        href="/customer/coach"
        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-200"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-xl">🌿</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">联系 Journey Coach</p>
          <p className="text-xs text-slate-400">有任何问题，随时联系你的专属教练团队</p>
        </div>
        <span className="text-slate-300">→</span>
      </Link>

      <Link
        href="/customer/summary"
        className="rounded-2xl bg-slate-900 py-4 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        完成今日总结
      </Link>
    </div>
  );
}
