"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { NutritionCard } from "@/components/ui/NutritionCard";
import { TaskCard } from "@/components/ui/TaskCard";
import { ScoreCircle } from "@/components/ui/ScoreCircle";
import { TrendChart } from "@/components/ui/TrendChart";
import { currentCustomer, currentCoach } from "@/lib/mock-data";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { addWater, useWaterIntake, useTodayTasks } from "@/lib/daily-progress";
import { useCustomerInventory, useHasInventoryRecords, useCustomerTransactions, useTodayMeals } from "@/lib/inventory/hooks";
import { calcAverageDailyUsage, calcEstimatedDaysRemaining } from "@/lib/inventory/engine";
import { InventoryStatusCard } from "@/components/inventory/InventoryStatusCard";
import type { ProductCode } from "@/lib/inventory/types";

const waterPresets = [100, 200, 350, 500];
const inventoryProducts: ProductCode[] = ["MISU_N_PLUS", "MISU_DX_PLUS"];

export default function CustomerDashboardPage() {
  const c = currentCustomer;
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const toGoalWeight = Math.max(0, +(c.currentWeight - c.targetWeight).toFixed(1));
  const { data: addedMeals } = useTodayMeals(customerId);
  const addedCalories = addedMeals.reduce((sum, m) => sum + m.calories, 0);
  const addedProtein = addedMeals.reduce((sum, m) => sum + m.protein, 0);
  const addedFiber = addedMeals.reduce((sum, m) => sum + m.fiber, 0);

  const water = useWaterIntake(c.nutritionToday.water, c.nutritionToday.waterTarget);
  const [customWater, setCustomWater] = useState("");

  const tasks = useTodayTasks(c, customerId);
  const completionRate = Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);

  const { data: hasInventory } = useHasInventoryRecords(customerId);
  const { data: inventoryRows } = useCustomerInventory(customerId);
  const { data: transactions } = useCustomerTransactions(customerId);

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 md:px-8">
      <PageHeader
        title={`早安，${c.name} ${c.avatar}`}
        subtitle={`Day ${c.currentDay} / ${c.planLength} · Every Day Is A New Journey`}
        action={
          <Link
            href="/customer/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xl"
          >
            {c.avatar}
          </Link>
        }
      />

      <div className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-sky-50 p-5">
        <ScoreCircle value={c.todayMisuScore} label="MISU Score" colorClass="text-emerald-500" trackClass="text-white/70" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-700">
              🔥 连续打卡 {c.streakDays} 天
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${Math.round((c.currentDay / c.planLength) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">计划进度 {Math.round((c.currentDay / c.planLength) * 100)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="今日完成率" value={`${completionRate}%`} icon="✅" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="连续打卡" value={c.streakDays} unit="天" icon="🔥" accent="bg-amber-50 text-amber-600" />
        <StatCard label="当前体重" value={c.currentWeight} unit="kg" icon="⚖️" accent="bg-sky-50 text-sky-600" />
        <StatCard label="距离目标体重" value={toGoalWeight} unit="kg" icon="🎯" accent="bg-rose-50 text-rose-500" />
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
            value={c.nutritionToday.calories + addedCalories}
            target={c.nutritionTargets.calories}
            unit="kcal"
            icon="🔥"
            color="bg-amber-400"
          />
          <NutritionCard
            label="蛋白质"
            value={c.nutritionToday.protein + addedProtein}
            target={c.nutritionTargets.protein}
            unit="g"
            icon="🥚"
            color="bg-sky-400"
          />
          <NutritionCard
            label="纤维"
            value={c.nutritionToday.fiber + addedFiber}
            target={c.nutritionTargets.fiber}
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
              今日 {water} / {c.nutritionToday.waterTarget}ml
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sky-50">
          <div
            className="h-full rounded-full bg-sky-400 transition-all"
            style={{ width: `${Math.round((water / c.nutritionToday.waterTarget) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {waterPresets.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => addWater(amount, c.nutritionToday.water, c.nutritionToday.waterTarget)}
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
                addWater(amount, c.nutritionToday.water, c.nutritionToday.waterTarget);
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
            <p className="text-xs text-sky-50">第 18 课：应对聚餐</p>
          </div>
        </Link>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">今日任务</p>
          <span className="text-xs text-slate-400">
            {tasks.filter((t) => t.done).length}/{tasks.length} 已完成
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">任务会随实际打卡、喝水、拍照记录自动完成，无需手动勾选</p>
      </div>

      <ProgressCard label="今日完成率" percent={completionRate} icon="📋" sublabel="继续完成剩余任务，保持连续打卡" />

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">体重趋势</p>
          <Link href="/customer/progress" className="text-xs font-medium text-emerald-600">
            查看完整进度 →
          </Link>
        </div>
        <TrendChart data={c.weightTrend} unit="kg" strokeClass="text-emerald-500" fillId="dash-weight" />
      </div>

      <Link
        href="/customer/coach"
        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-200"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-xl">
          {currentCoach.avatar}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">联系 Journey Coach</p>
          <p className="text-xs text-slate-400">{currentCoach.name} · {currentCoach.title}</p>
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
