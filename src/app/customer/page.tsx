"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { NutritionCard } from "@/components/ui/NutritionCard";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { addWater, useWaterIntake } from "@/lib/daily-progress";
import { useTodayMeals, useTodayCheckIn, useCustomerCheckIns } from "@/lib/inventory/hooks";
import { useCurrentCustomerGoal } from "@/lib/goals/hooks";
import { calculateWaterTargetMl } from "@/lib/goals/goal-calculator";

const waterPresets = [100, 200, 350, 500];
/** Only used for the brief window before the real per-customer target
 * (Journey Start Weight x 40ml, from customer_goals) has loaded. */
const FALLBACK_WATER_TARGET_ML = 2000;
const DEFAULT_NUTRITION_TARGETS = { calories: 1500, protein: 90, fiber: 25 };
/** Morning-weigh-in cutoff hour (24h, local time). Past this hour with no
 * check-in yet, we stop nudging for "today" and just wait for tomorrow. */
const WEIGH_IN_CUTOFF_HOUR = 12;

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "早安";
  if (hour >= 12 && hour < 18) return "午安";
  if (hour >= 18 && hour < 23) return "晚上好";
  return "夜深了";
}

/** The server has no notion of the customer's local clock, so reading
 * `new Date().getHours()` directly in render would mismatch between the
 * server-rendered HTML and the client's first paint. useSyncExternalStore's
 * getServerSnapshot exists exactly for this: render a neutral hour during
 * SSR/hydration, then swap to the real local hour right after mount. */
function subscribeNoop() {
  return () => {};
}
function getClientHour() {
  return new Date().getHours();
}
function getServerHour() {
  return 8;
}
function useLocalHour(): number {
  return useSyncExternalStore(subscribeNoop, getClientHour, getServerHour);
}

export default function CustomerDashboardPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: journey } = useJourneySummary(customerId);
  const { data: currentGoal } = useCurrentCustomerGoal(customerId);
  const { data: addedMeals } = useTodayMeals(customerId);
  const addedCalories = addedMeals.reduce((sum, m) => sum + m.calories, 0);
  const addedProtein = addedMeals.reduce((sum, m) => sum + m.protein, 0);
  const addedFiber = addedMeals.reduce((sum, m) => sum + m.fiber, 0);

  const waterTarget = currentGoal?.waterTargetMl ?? (journey?.startWeight ? calculateWaterTargetMl(journey.startWeight) : FALLBACK_WATER_TARGET_ML);
  const water = useWaterIntake(customerId, 0, waterTarget);
  const [customWater, setCustomWater] = useState("");

  const { data: todayCheckIn } = useTodayCheckIn(customerId);
  const { data: checkIns } = useCustomerCheckIns(customerId);

  const weighInDone = Boolean(todayCheckIn);
  const mealDone = addedMeals.length > 0;
  const waterDone = water >= waterTarget;
  const todayTasksDone = [weighInDone, mealDone, waterDone].filter(Boolean).length;
  const journeyProgressPercent = Math.round((todayTasksDone / 3) * 100);
  const currentHour = useLocalHour();
  const pastWeighInWindow = currentHour >= WEIGH_IN_CUTOFF_HOUR;
  const greeting = getGreeting(currentHour);

  const latestWeight = checkIns[0]?.weight ?? null;
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
        title={`${greeting}，${journey?.name ?? ""} ${journey?.avatar ?? ""}`}
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

      <ProgressCard label="今日 Journey 完成度" percent={journeyProgressPercent} icon="🌱" sublabel="完成今天的任务，保持你的 Journey" />

      {currentGoal && (
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">🎯 第一阶段目标</p>
          {!hasWeightGoal ? (
            <p className="text-sm text-slate-500">目前专注在习惯养成，暂无体重目标。每一个阶段完成以后，再重新评估下一阶段目标。</p>
          ) : (
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">今日体重</p>
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

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">今日任务</p>
        <div className="flex flex-col gap-2">
          {weighInDone ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">⚖️</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500 line-through">今日晨重</p>
                <p className="text-xs text-slate-400">已记录 {todayCheckIn?.weight}kg</p>
              </div>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400 bg-emerald-400 text-xs text-white">✓</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">⚖️</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">今日晨重</p>
                <p className="text-xs text-slate-400">
                  {pastWeighInWindow ? "今天已经错过晨重，明天早上继续记录就可以 ❤️" : "今天还没有记录晨重"}
                </p>
              </div>
              {!pastWeighInWindow && (
                <Link
                  href="/customer/checkin"
                  className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                >
                  记录晨重
                </Link>
              )}
              {pastWeighInWindow && <span className="shrink-0 text-lg">❤️</span>}
            </div>
          )}

          <Link
            href="/customer/meals/add"
            className={`flex items-center gap-3 rounded-2xl border p-3.5 transition ${mealDone ? "border-emerald-100 bg-emerald-50/60" : "border-slate-100 bg-white hover:border-emerald-200"}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">🥗</span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${mealDone ? "text-slate-500 line-through" : "text-slate-800"}`}>饮食打卡</p>
              <p className="text-xs text-slate-400">{mealDone ? `已记录 ${addedMeals.length} 餐` : "拍照记录你的 211 餐盘"}</p>
            </div>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${mealDone ? "border-emerald-400 bg-emerald-400 text-white" : "border-slate-300 text-transparent"}`}>✓</span>
          </Link>

          <div className={`flex items-center gap-3 rounded-2xl border p-3.5 ${waterDone ? "border-emerald-100 bg-emerald-50/60" : "border-slate-100 bg-white"}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">💧</span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${waterDone ? "text-slate-500 line-through" : "text-slate-800"}`}>饮水打卡</p>
              <p className="text-xs text-slate-400">已喝 {water} / {waterTarget}ml</p>
            </div>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${waterDone ? "border-emerald-400 bg-emerald-400 text-white" : "border-slate-300 text-transparent"}`}>✓</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>今日目标</span>
          <span className="font-semibold text-slate-700">{waterTarget}ml</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-sky-50">
          <div
            className="h-full rounded-full bg-sky-400 transition-all"
            style={{ width: `${Math.round((water / waterTarget) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {waterPresets.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => addWater(customerId, amount, 0, waterTarget)}
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
                addWater(customerId, amount, 0, waterTarget);
                setCustomWater("");
              }
            }}
            className="shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            添加
          </button>
        </div>
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
        href="/customer/learn"
        className="flex items-center gap-3 rounded-2xl bg-sky-500 p-4 text-white shadow-sm transition hover:bg-sky-600"
      >
        <span className="text-xl">📚</span>
        <div>
          <p className="text-sm font-semibold">今日学习</p>
          <p className="text-xs text-sky-50">继续你的学习进度 →</p>
        </div>
      </Link>

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
