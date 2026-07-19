"use client";

import { useState } from "react";
import Link from "next/link";
import { JourneyTaskCard } from "@/components/ui/JourneyTaskCard";
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
import { useMyTodayContent } from "@/lib/cms/hooks";
import { REFLECTION_UNLOCK_HOUR } from "@/lib/checkout/constants";
import { useLocalHour } from "@/lib/useLocalHour";

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
const LOCKED_HINT_REFLECTION = "今晚开放";
/** Today's Journey = these five tasks. The progress card counts exactly them, so
 * the percentage can never disagree with what the customer sees in the list. */
const TODAY_JOURNEY_TASK_COUNT = 5;

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "早安";
  if (hour >= 12 && hour < 18) return "午安";
  if (hour >= 18 && hour < 23) return "晚上好";
  return "夜深了";
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
  // The custom-amount input stays folded away so the Dashboard reads as an
  // overview; the three one-tap presets cover the common case.
  const [waterSheetOpen, setWaterSheetOpen] = useState(false);
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
  // A day with nothing scheduled has no learning to do, so it isn't held against
  // the customer — otherwise 5/5 would be unreachable on those days.
  const { data: todayLearning } = useMyTodayContent();
  const learningDone = todayLearning.length === 0 || todayLearning.every((i) => i.completed);
  const reflectionDone = Boolean(todayCheckout);
  const todayTasksDone = [weighInDone, mealDone, waterDone, learningDone, reflectionDone].filter(Boolean).length;
  const currentHour = useLocalHour() ?? 8;
  const tooEarlyForMorning = currentHour < MORNING_WINDOW_START_HOUR;
  const pastWeighInWindow = currentHour >= WEIGH_IN_CUTOFF_HOUR;
  const inMorningWindow = !tooEarlyForMorning && !pastWeighInWindow;
  const greeting = getGreeting(currentHour);
  const lockedHint = tooEarlyForMorning ? LOCKED_HINT_TOO_EARLY : LOCKED_HINT_PENDING_MORNING;
  const reflectionUnlocked = currentHour >= REFLECTION_UNLOCK_HOUR;

  // The single next recommended task — the first one the customer can actually
  // act on right now, in daily order. Drives one quiet NEXT badge, nothing more.
  const morningSkipped = todayJourney?.morningWeightStatus === "skipped";
  const nextTask = !weighInDone && !morningSkipped && inMorningWindow
    ? "weigh"
    : journeyActive && !mealDone
      ? "meal"
      : journeyActive && !waterDone
        ? "water"
        : journeyActive && !learningDone
          ? "learning"
          : journeyActive && !reflectionDone && reflectionUnlocked
            ? "reflection"
            : null;

  // ── Task type ──────────────────────────────────────────────────────────
  // Type A (one-time: 晨重 / 学习 / 回顾) compress into chips once settled.
  // Type B (continuous: 饮食 / 饮水) stay expanded all day — customers keep
  // coming back to them, so collapsing them would cost taps, not clutter.
  const weighSettled = weighInDone || morningSkipped;
  const learningSettled = journeyActive && learningDone;
  const reflectionSettled = reflectionDone;

  const settledChips = [
    weighSettled &&
      (weighInDone ? (
        <JourneyTaskCard key="weigh" icon="⚖️" label="今日晨重" status="completed" variant="chip" value={`${todayCheckIn?.weight}kg`} href="/customer/checkin" />
      ) : (
        <JourneyTaskCard key="weigh" icon="⚖️" label="今日晨重" status="available" variant="chip" value="已跳过" />
      )),
    // The learning chip is rendered by TodayContentCard itself, since it owns
    // today's content and the review modal it reopens.
    learningSettled && <TodayContentCard key="learning" />,
    reflectionSettled && <JourneyTaskCard key="reflection" icon="🌙" label="今日回顾" status="completed" variant="chip" />,
  ].filter(Boolean);

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
    <div className="flex flex-col gap-6 px-4 pb-6 md:px-8">
      {/* Header — three deliberate levels: who you are, where you are, and the
          philosophy that frames the whole app. The slogan is product, not
          decoration: it stays visible every day, just quieter than the greeting.
          Rendered inline (not PageHeader) so all three levels can breathe and
          align with the cards below. */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-slate-900">
            {greeting}，{journey?.name ?? ""}
          </h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">
            Day {currentDay} / {planLength}
          </p>
          <p className="mt-1.5 text-xs font-medium text-emerald-600/90">Every Day Is A New Journey</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setCoachSheetOpen(true)}
            aria-label="联系 Journey Coach"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-lg"
          >
            🌿
          </button>
          <Link href="/customer/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xl">
            {journey?.avatar ?? "🙂"}
          </Link>
        </div>
      </header>

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

      {/* Goal — a light two-fact summary. The full analytics live on 成长旅程. */}
      {currentGoal && (
        <Link href="/customer/progress" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200">
          {!hasWeightGoal ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">🎯 第一阶段目标</p>
                <p className="mt-0.5 truncate text-sm font-medium text-slate-700">专注习惯养成</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-500">查看 →</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">目前体重</p>
                <p className="mt-0.5 text-2xl font-bold leading-tight text-slate-900">
                  {latestWeight !== null ? `${latestWeight}` : "—"}
                  {latestWeight !== null && <span className="ml-0.5 text-sm font-medium text-slate-400">kg</span>}
                </p>
              </div>
              <div className="h-9 w-px shrink-0 bg-slate-100" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">距离目标</p>
                <p className="mt-0.5 truncate text-2xl font-bold leading-tight text-emerald-600">
                  {goalReached ? (
                    "🎉 已达成"
                  ) : remaining ? (
                    <>
                      {remaining.min === remaining.max ? remaining.min : `${remaining.min}~${remaining.max}`}
                      <span className="ml-0.5 text-sm font-medium text-slate-400">kg</span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <span className="shrink-0 self-center text-xs font-medium text-slate-500">查看 →</span>
            </div>
          )}
        </Link>
      )}

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold text-slate-800">🌱 Today&apos;s Journey</p>
          <p className="shrink-0 text-xs font-medium text-slate-500">
            <span className="text-sm font-bold text-emerald-600">{todayTasksDone}</span> / {TODAY_JOURNEY_TASK_COUNT} 已完成
          </p>
        </div>

        {/* Settled one-time tasks, compressed. The Dashboard gets lighter as the
            day progresses instead of holding five equal cards to bedtime. */}
        {settledChips.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{settledChips}</div>}

        <div className="flex flex-col gap-2">
          {/* 1. 今日晨重 — only while outstanding; it gates everything below. */}
          {!weighSettled &&
            (tooEarlyForMorning ? (
              <JourneyTaskCard icon="⚖️" label="今日晨重" status="locked" value={LOCKED_HINT_TOO_EARLY} variant="row" />
            ) : inMorningWindow ? (
              <JourneyTaskCard
                icon="⚖️"
                label="今日晨重"
                status="available"
                variant="row"
                href="/customer/checkin"
                actionSlot={<span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">开始 →</span>}
                isNext={nextTask === "weigh"}
              />
            ) : (
              <JourneyTaskCard
                icon="⚖️"
                label="今日晨重"
                status="attention"
                variant="row"
                value={skipError ?? "已错过晨重时间"}
                actionSlot={
                  <button
                    type="button"
                    disabled={skipping}
                    onClick={handleSkipMorning}
                    className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {skipping ? "处理中..." : "跳过"}
                  </button>
                }
              />
            ))}

          {/* 2. 饮食打卡 — CONTINUOUS: the primary action card, always expanded. */}
          {!journeyActive ? (
            <JourneyTaskCard icon="🍽️" label="饮食打卡" status="locked" value={lockedHint} variant="row" />
          ) : mealDone ? (
            <JourneyTaskCard
              icon="🍽️"
              label="饮食打卡"
              status="completed"
              variant="row"
              value={`已记录 ${addedMeals.length} 餐`}
              href="/customer/meals/add"
              actionSlot={<span className="shrink-0 rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-600">再记一餐 →</span>}
            />
          ) : (
            <JourneyTaskCard
              icon="🍽️"
              label="饮食打卡"
              status="available"
              variant="row"
              href="/customer/meals/add"
              actionSlot={<span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">开始 →</span>}
              isNext={nextTask === "meal"}
            />
          )}

          {/* 3. 饮水打卡 — CONTINUOUS: the largest interactive card, always open. */}
          <div>
            {!journeyActive ? (
              <JourneyTaskCard icon="💧" label="饮水打卡" status="locked" value={lockedHint} variant="row" />
            ) : (
              <JourneyTaskCard
                icon="💧"
                label="饮水打卡"
                status={waterDone ? "completed" : "in_progress"}
                value={`${water} / ${waterTarget}ml`}
                percent={Math.round((water / waterTarget) * 100)}
                variant="row"
                isNext={nextTask === "water"}
              >
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {waterPresets.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => addWater(amount)}
                      className="flex min-h-[44px] items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sm font-semibold text-sky-700 transition hover:border-sky-300 active:scale-95"
                    >
                      +{amount}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWaterSheetOpen((v) => !v)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 text-sm font-medium text-slate-500 transition hover:border-slate-300"
                  >
                    {waterSheetOpen ? "收起" : "其他"}
                  </button>
                </div>
                {waterSheetOpen && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={customWater}
                      onChange={(e) => setCustomWater(e.target.value)}
                      placeholder="自定义 ml"
                      className="w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const amount = Number(customWater);
                        if (amount > 0) {
                          addWater(amount);
                          setCustomWater("");
                          setWaterSheetOpen(false);
                        }
                      }}
                      className="min-h-[44px] shrink-0 rounded-xl bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-600"
                    >
                      添加
                    </button>
                  </div>
                )}
              </JourneyTaskCard>
            )}
          </div>

          {/* 4 & 5 — ONE-TIME tasks still outstanding stay as tiles; once
              settled they move into the chip row above. */}
          {(!learningSettled || !reflectionSettled) && (
            <div className="grid grid-cols-2 gap-2">
              {!learningSettled &&
                (journeyActive ? (
                  <TodayContentCard isNext={nextTask === "learning"} />
                ) : (
                  <JourneyTaskCard icon="📚" label="今日学习" status="locked" value={lockedHint} />
                ))}

              {!reflectionSettled &&
                (!journeyActive ? (
                  <JourneyTaskCard icon="🌙" label="今日回顾" status="locked" value={lockedHint} />
                ) : !reflectionUnlocked ? (
                  <JourneyTaskCard icon="🌙" label="今日回顾" status="locked" value={LOCKED_HINT_REFLECTION} />
                ) : (
                  <JourneyTaskCard icon="🌙" label="今日回顾" status="available" href="/customer/checkout" actionLabel="开始 →" isNext={nextTask === "reflection"} />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Journey 起点 and 身形记录 are the same workflow, so exactly one shows:
          the baseline until it's complete, then the long-term body tracker. */}
      {baselineStatus.loaded &&
        (!baselineStatus.complete ? (
          customerId && <JourneyBaselineReminder customerId={customerId} />
        ) : !bodyProgressLoading && bodyProgressActionable ? (
          <JourneyTaskCard
            icon="📷"
            label="身形记录"
            status="available"
            variant="row"
            href={bodyProgressCtaHref(bodyProgressCta)}
            actionSlot={
              <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">
                {BODY_PROGRESS_CTA_LABEL[bodyProgressCta.kind]}
              </span>
            }
          />
        ) : null)}

      {/* Supporting information — a summary strip, not a competing section.
          The full breakdown lives on the Meals page. */}
      {nutritionTargets ? (
        <Link href="/customer/meals" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">今日营养</p>
            <span className="shrink-0 text-xs font-medium text-slate-500">查看 →</span>
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <p className="text-2xl font-bold leading-tight text-slate-900">
              {addedCalories}
              <span className="ml-0.5 text-sm font-medium text-slate-400">kcal</span>
            </p>
            <p className="truncate text-xs text-slate-500">
              蛋白质 {addedProtein >= nutritionTargets.dailyProtein ? "✔" : `${addedProtein}g`} · 蔬菜{" "}
              {vegServingsDone >= VEGETABLE_SERVINGS_TARGET ? "✔" : `${vegServingsDone}/${VEGETABLE_SERVINGS_TARGET}`}
            </p>
          </div>
        </Link>
      ) : !nutritionTargetsLoading ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
          完善身高/体重/年龄/性别/活动量资料后，将自动生成你的每日营养目标。
        </div>
      ) : null}

      {/* Supporting guidance — the quietest layer on the page. */}
      {nutritionTargets && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 px-4 py-3">
          <span className="shrink-0 text-sm leading-relaxed">🤖</span>
          <p className="text-xs leading-relaxed text-slate-500">
            {buildDailyNutritionAdvice({
              caloriesPercent: Math.round((addedCalories / nutritionTargets.dailyCalories) * 100),
              proteinPercent: Math.round((addedProtein / nutritionTargets.dailyProtein) * 100),
              vegServingsDone,
              vegServingsTarget: VEGETABLE_SERVINGS_TARGET,
              waterPercent: Math.round((water / waterTarget) * 100),
            })}
          </p>
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
