"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { NutritionCard } from "@/components/ui/NutritionCard";
import { LockedTaskCard } from "@/components/ui/LockedTaskCard";
import { CoachContactSheet } from "@/components/CoachContactSheet";
import { NotificationBell } from "@/components/customer/NotificationBell";
import { JourneyBaselineReminder } from "@/components/customer/JourneyBaselineReminder";
import { TodayContentCard } from "@/components/cms/TodayContentCard";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useWaterIntake } from "@/lib/daily-progress";
import { useTodayMeals, useTodayCheckIn, useCustomerCheckIns } from "@/lib/inventory/hooks";
import { todayDateStr, yesterdayDateStr } from "@/lib/inventory/engine";
import { useCurrentCustomerGoal } from "@/lib/goals/hooks";
import { calculateWaterTargetMl } from "@/lib/goals/goal-calculator";
import { useCheckoutForDate } from "@/lib/checkout/hooks";
import { useTodayJourneyDay } from "@/lib/journey-day/hooks";
import { skipMorningCheckin } from "@/lib/journey-day/engine";
import { useCurrentNutritionTargets } from "@/lib/nutrition/hooks";
import { buildDailyNutritionAdvice } from "@/lib/nutrition/daily-advice";
import { countVegetableServings, VEGETABLE_SERVINGS_TARGET } from "@/lib/meal-check/plate-analysis";
import { useBodyProgressHomeState } from "@/lib/bodyProgress/hooks";
import { BODY_PROGRESS_CTA_LABEL, bodyProgressCtaHref } from "@/lib/bodyProgress/engine";
import { useJourneyBaselineStatus } from "@/lib/baseline/hooks";

const waterPresets = [100, 200, 300];
/** Only used for the brief window before the real per-customer target
 * (Journey Start Weight x 40ml, from customer_goals) has loaded. */
const FALLBACK_WATER_TARGET_ML = 2000;
/** Morning weigh-in window (24h, local time): before the start hour it's
 * still "night" (locked, no action offered yet); from start to cutoff is the
 * real window (weigh-in offered); past the cutoff with no check-in, offer
 * skipping instead. Matches the 4am Journey Day rollover used server-side. */
const MORNING_WINDOW_START_HOUR = 4;
const WEIGH_IN_CUTOFF_HOUR = 12;
const LOCKED_HINT_TOO_EARLY = "明早 4:00 开放";
const LOCKED_HINT_PENDING_MORNING = "完成晨重后开放";
/** 今日回顾 belongs to tonight: the Dashboard keeps it locked until this hour so
 * the customer reads it as "this one is for later". Dashboard presentation only —
 * /customer/checkout itself is unchanged and still reachable. Single knob. */
const REFLECTION_UNLOCK_HOUR = 19;
const LOCKED_HINT_REFLECTION = "今晚开放";

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
  const { data: nutritionTargets, loading: nutritionTargetsLoading } = useCurrentNutritionTargets(customerId);
  const { data: addedMeals } = useTodayMeals(customerId);
  const addedCalories = addedMeals.reduce((sum, m) => sum + m.calories, 0);
  const addedProtein = addedMeals.reduce((sum, m) => sum + m.protein, 0);
  const vegServingsDone = countVegetableServings(addedMeals);

  const waterTarget = currentGoal?.waterTargetMl ?? (journey?.startWeight ? calculateWaterTargetMl(journey.startWeight) : FALLBACK_WATER_TARGET_ML);
  const { water, addWater } = useWaterIntake(customerId);
  const [customWater, setCustomWater] = useState("");
  const [coachSheetOpen, setCoachSheetOpen] = useState(false);

  const { data: todayCheckIn } = useTodayCheckIn(customerId);
  const { data: checkIns } = useCustomerCheckIns(customerId);

  const today = todayDateStr();
  const yesterday = yesterdayDateStr();
  const { data: todayCheckout } = useCheckoutForDate(customerId, today);
  const { data: yesterdayCheckout, loading: yesterdayCheckoutLoading } = useCheckoutForDate(customerId, yesterday);

  const { data: todayJourney, loading: todayJourneyLoading, refresh: refreshJourney } = useTodayJourneyDay(customerId, today);
  const { cta: bodyProgressCta, loading: bodyProgressLoading } = useBodyProgressHomeState(customerId);
  const bodyProgressActionable = bodyProgressCta.kind !== "view_growth_journey";
  // Journey 起点 and 身形记录 are the same workflow — exactly one may show.
  const { status: baselineStatus } = useJourneyBaselineStatus(customerId);
  const journeyActive = (todayJourney?.status ?? "waiting_for_morning") === "active";
  const [skipping, setSkipping] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);

  const weighInDone = Boolean(todayCheckIn);
  const mealDone = addedMeals.length > 0;
  const waterDone = water >= waterTarget;
  const todayTasksDone = [weighInDone, mealDone, waterDone].filter(Boolean).length;
  const journeyProgressPercent = Math.round((todayTasksDone / 3) * 100);
  const currentHour = useLocalHour();
  const tooEarlyForMorning = currentHour < MORNING_WINDOW_START_HOUR;
  const pastWeighInWindow = currentHour >= WEIGH_IN_CUTOFF_HOUR;
  const inMorningWindow = !tooEarlyForMorning && !pastWeighInWindow;
  const greeting = getGreeting(currentHour);
  const lockedHint = tooEarlyForMorning ? LOCKED_HINT_TOO_EARLY : LOCKED_HINT_PENDING_MORNING;
  const reflectionUnlocked = currentHour >= REFLECTION_UNLOCK_HOUR;

  async function handleSkipMorning() {
    setSkipping(true);
    setSkipError(null);
    const result = await skipMorningCheckin(customerId, today);
    setSkipping(false);
    if (!result.ok) {
      setSkipError(result.error ?? "操作失败，请重试");
      return;
    }
    refreshJourney();
  }

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

  // Only nudge for a missed checkout if "yesterday" was actually a Journey
  // day for this customer (not before they registered) — otherwise a brand
  // new customer would get a bogus "make up yesterday" prompt on day 1. This
  // is a non-blocking inline card, not a modal — it must never hide the rest
  // of the dashboard.
  const needsCatchup = currentDay > 1 && !yesterdayCheckoutLoading && !yesterdayCheckout;

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 md:px-8">
      <PageHeader
        title={`${greeting}，${journey?.name ?? ""} ${journey?.avatar ?? ""}`}
        subtitle={`Day ${currentDay} / ${planLength} · Every Day Is A New Journey`}
        action={
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setCoachSheetOpen(true)}
              aria-label="联系 Journey Coach"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-lg"
            >
              🌿
            </button>
            <Link
              href="/customer/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xl"
            >
              {journey?.avatar ?? "🙂"}
            </Link>
          </div>
        }
      />

      <CoachContactSheet open={coachSheetOpen} onClose={() => setCoachSheetOpen(false)} />

      {!todayJourneyLoading && !journeyActive && tooEarlyForMorning && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
          明早 4:00 后开放新的 Journey 任务。
        </div>
      )}

      {needsCatchup && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl">🌙</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">昨天的睡前回顾还没完成</p>
            <p className="mt-0.5 text-xs text-slate-500">花一点时间补上昨天的记录。</p>
          </div>
          <Link
            href={`/customer/checkout?date=${yesterday}`}
            className="shrink-0 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
          >
            完成昨天回顾
          </Link>
        </div>
      )}

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
        <p className="mb-2 text-sm font-semibold text-slate-700">🌱 Today&apos;s Journey</p>
        <div className="flex flex-col gap-2">
          {weighInDone ? (
            <Link
              href="/customer/checkin"
              className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 transition hover:border-emerald-200"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">⚖️</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500 line-through">今日晨重</p>
                <p className="text-xs text-slate-400">已记录 {todayCheckIn?.weight}kg</p>
              </div>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400 bg-emerald-400 text-xs text-white">✓</span>
            </Link>
          ) : todayJourney?.morningWeightStatus === "skipped" ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">⚖️</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500">今日晨重</p>
                <p className="text-xs text-slate-400">今天选择不记录晨重</p>
              </div>
            </div>
          ) : tooEarlyForMorning ? (
            <LockedTaskCard icon="⚖️" label="今日晨重" hint={LOCKED_HINT_TOO_EARLY} />
          ) : inMorningWindow ? (
            <Link
              href="/customer/checkin"
              className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 transition hover:border-emerald-300"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">⚖️</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">今日晨重</p>
                <p className="text-xs text-slate-400">完成晨重，正式开始今天的 Journey</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">开始今日晨重</span>
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">⚖️</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">今日晨重</p>
                <p className="text-xs text-slate-400">{skipError ?? "今天错过晨重也没关系，可以直接开始今天的 Journey"}</p>
              </div>
              <button
                type="button"
                disabled={skipping}
                onClick={handleSkipMorning}
                className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
              >
                {skipping ? "处理中..." : "跳过晨重"}
              </button>
            </div>
          )}

          {journeyActive ? (
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
          ) : (
            <LockedTaskCard icon="🥗" label="饮食打卡" hint={lockedHint} />
          )}

          {/* 3. 饮水打卡 */}
          {journeyActive ? (
            <div className={`rounded-2xl border p-4 shadow-sm ${waterDone ? "border-emerald-100 bg-emerald-50/60" : "border-sky-100 bg-white"}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">💧</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">饮水打卡</p>
                  <p className="text-2xl font-bold leading-tight text-sky-600">
                    {water}
                    <span className="ml-1 text-sm font-normal text-slate-400">/ {waterTarget}ml</span>
                  </p>
                </div>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${waterDone ? "border-emerald-400 bg-emerald-400 text-white" : "border-slate-300 text-transparent"}`}>✓</span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sky-50">
                <div
                  className="h-full rounded-full bg-sky-400 transition-all"
                  style={{ width: `${Math.min(100, Math.round((water / waterTarget) * 100))}%` }}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {waterPresets.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => addWater(amount)}
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
                      addWater(amount);
                      setCustomWater("");
                    }
                  }}
                  className="shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  添加
                </button>
              </div>
            </div>
          ) : (
            <LockedTaskCard icon="💧" label="饮水打卡" hint={lockedHint} />
          )}

          {/* 4. 今日学习 — completed state stays visible + reopenable. */}
          {journeyActive ? <TodayContentCard /> : <LockedTaskCard icon="📚" label="今日小知识" hint={lockedHint} />}

          {/* 5. 今日回顾 — this one belongs to tonight: locked until the evening
              hour, then active, then completed. */}
          {!journeyActive ? (
            <LockedTaskCard icon="🌙" label="今日回顾" hint={lockedHint} />
          ) : todayCheckout ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">🌙</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500 line-through">今日回顾</p>
                <p className="text-xs text-slate-400">✅ 今日已完成</p>
              </div>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400 bg-emerald-400 text-xs text-white">✓</span>
            </div>
          ) : !reflectionUnlocked ? (
            <LockedTaskCard icon="🌙" label="今日回顾" hint={LOCKED_HINT_REFLECTION} />
          ) : (
            <Link
              href="/customer/checkout"
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:border-emerald-200"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg">🌙</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">今日回顾</p>
                <p className="text-xs text-slate-400">记录今天的身体变化与生活情况</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">开始 →</span>
            </Link>
          )}
        </div>
      </div>

      {/* Journey 起点 and 身形记录 are the same workflow, so exactly one shows:
          the baseline until it's complete, then the long-term body tracker. */}
      {baselineStatus.loaded &&
        (!baselineStatus.complete ? (
          customerId && <JourneyBaselineReminder customerId={customerId} />
        ) : !bodyProgressLoading && bodyProgressActionable ? (
          <Link
            href={bodyProgressCtaHref(bodyProgressCta)}
            className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-200"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xl">📷</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">身形记录</p>
              <p className="text-xs text-slate-400">记录你的身形变化，为自己留下一个参考</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">{BODY_PROGRESS_CTA_LABEL[bodyProgressCta.kind]}</span>
          </Link>
        ) : null)}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">今日营养</p>
          <Link href="/customer/meals" className="text-xs font-medium text-sky-600">
            查看详情 →
          </Link>
        </div>
        {nutritionTargets ? (
          <Link href="/customer/meals" className="grid grid-cols-2 gap-3">
            <NutritionCard label="热量" value={addedCalories} target={nutritionTargets.dailyCalories} unit="kcal" icon="🔥" color="bg-amber-400" />
            <NutritionCard label="蛋白质" value={addedProtein} target={nutritionTargets.dailyProtein} unit="g" icon="🥩" color="bg-sky-400" />
            <NutritionCard label="蔬菜" value={vegServingsDone} target={VEGETABLE_SERVINGS_TARGET} unit="份" icon="🥬" color="bg-emerald-400" />
            <NutritionCard label="饮水" value={water} target={waterTarget} unit="ml" icon="💧" color="bg-sky-400" />
          </Link>
        ) : !nutritionTargetsLoading ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
            完善身高/体重/年龄/性别/活动量资料后，将自动生成你的每日营养目标。
          </div>
        ) : null}
      </div>

      {nutritionTargets && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">🤖</span>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold text-sky-700">AI 今日建议</p>
            <p className="text-sm text-slate-700">
              {buildDailyNutritionAdvice({
                caloriesPercent: Math.round((addedCalories / nutritionTargets.dailyCalories) * 100),
                proteinPercent: Math.round((addedProtein / nutritionTargets.dailyProtein) * 100),
                vegServingsDone,
                vegServingsTarget: VEGETABLE_SERVINGS_TARGET,
                waterPercent: Math.round((water / waterTarget) * 100),
              })}
            </p>
          </div>
        </div>
      )}

      <Link
        href="/customer/summary"
        className="rounded-2xl bg-slate-900 py-4 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        完成今日总结
      </Link>
    </div>
  );
}
