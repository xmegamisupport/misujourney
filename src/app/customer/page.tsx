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
import { calculateStageProgress } from "@/lib/goals/stage-progress";
import { useCheckoutForDate } from "@/lib/checkout/hooks";
import { useTodayJourneyDay } from "@/lib/journey-day/hooks";
import { skipMorningCheckin } from "@/lib/journey-day/engine";

import { useBodyProgressHomeState } from "@/lib/bodyProgress/hooks";
import { BODY_PROGRESS_CTA_LABEL, bodyProgressCtaHref } from "@/lib/bodyProgress/engine";
import { useJourneyBaselineStatus } from "@/lib/baseline/hooks";
import { useMyTodayContent } from "@/lib/cms/hooks";
import { REFLECTION_UNLOCK_HOUR } from "@/lib/checkout/constants";
import { useLocalHour } from "@/lib/useLocalHour";
import { selectMisuMessage } from "@/lib/misu-voice/engine";
import { MisuVoiceCard } from "@/components/customer/MisuVoiceCard";

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
  const { data: addedMeals } = useTodayMeals(customerId);

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

  const { data: todayJourney, refresh: refreshJourney } = useTodayJourneyDay(customerId, today);
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
  // ONE-TIME (晨重 / 学习 / 回顾) shrink to a compact card once settled.
  // CONTINUOUS (饮食 / 饮水) stay full size all day — customers keep coming
  // back to them, so collapsing them would cost taps rather than remove clutter.

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
  // Progress made, not distance left. Measured against the NEAREST edge of the
  // goal range — reaching it means the customer has entered their goal band.
  // Before the first weigh-in we measure from the base weight, i.e. 0%.
  const stageProgress = hasWeightGoal
    ? calculateStageProgress(currentGoal!.baseWeightKg, latestWeight ?? currentGoal!.baseWeightKg, currentGoal!.stageGoalWeightMax)
    : null;

  // ❤️ MISU 想告诉你 — the Dashboard's answer to "how should I understand today?"
  // Built entirely from data this page already loads: no extra queries.
  const daysSinceLastWeighIn = checkIns[0]?.date
    ? Math.max(0, Math.round((new Date(today).getTime() - new Date(checkIns[0].date).getTime()) / 86_400_000))
    : null;
  const misuMessage = selectMisuMessage({
    journeyDay: currentDay,
    tasksDone: todayTasksDone,
    tasksTotal: TODAY_JOURNEY_TASK_COUNT,
    daysSinceLastWeighIn,
    latestWeight,
    previousWeight: checkIns[1]?.weight ?? null,
    yesterdayConditions: yesterdayCheckout?.specialConditions ?? [],
    yesterdayBowel: yesterdayCheckout?.bowelMovement ?? null,
    todayBowel: todayCheckout?.bowelMovement ?? null,
    waterPercent: Math.round((water / waterTarget) * 100),
    localHour: currentHour,
  });

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

      {/* Goal — a light two-fact summary. The full analytics live on 成长旅程. */}
      {/* Only once there's a real weigh-in — otherwise this renders "— kg / 0%"
          to every new customer, and stays dead permanently for anyone who never
          weighs in. Nothing is better than a hollow number. */}
      {currentGoal && latestWeight !== null && (
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
            <>
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
                  <p className="text-xs text-slate-400">第一阶段</p>
                  <p className="mt-0.5 truncate text-2xl font-bold leading-tight text-emerald-600">
                    {stageProgress?.percent ?? 0}%<span className="ml-1 text-sm font-medium text-slate-400">完成</span>
                  </p>
                </div>
                <span className="shrink-0 self-center text-xs font-medium text-slate-500">查看 →</span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${stageProgress?.percent ?? 0}%` }}
                />
              </div>

              {stageProgress && <p className="mt-2 text-xs leading-relaxed text-slate-500">{stageProgress.message}</p>}
            </>
          )}
        </Link>
      )}

      {/* Journey 起点 sits ABOVE Today's Journey because it is time-sensitive:
          today's tasks can be picked up again tomorrow, but a starting point
          captured late is never a true starting point again. One slot — the
          baseline until it's complete, then the long-term body tracker. */}
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

      {/* On an emotionally significant day MISU speaks BEFORE the task list —
          she needs to understand the day before she's asked to act on it. */}
      {misuMessage?.tier === 2 && <MisuVoiceCard message={misuMessage} />}

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold text-slate-800">🌱 Today&apos;s Journey</p>
          <p className="shrink-0 text-xs font-medium text-slate-500">
            <span className="text-sm font-bold text-emerald-600">{todayTasksDone}</span> / {TODAY_JOURNEY_TASK_COUNT} 已完成
          </p>
        </div>

        {/* Fixed grid — every task keeps its slot; completing a ONE-TIME task
            only shrinks its card, so nothing jumps around during the day.
              Row 1  今日晨重 | 今日学习   (one-time → compress when settled)
              Row 2  饮水打卡              (continuous → always full width)
              Row 3  饮食打卡 | 今日回顾   (continuous | one-time) */}
        <div className="grid grid-cols-2 gap-2">
          {/* 1. 今日晨重 — ONE-TIME */}
          {weighInDone ? (
            // No weight value here — the goal card above already shows 目前体重,
            // and the half-width compact card is tight once the icon returns.
            <JourneyTaskCard icon="⚖️" label="今日晨重" status="completed" variant="compact" href="/customer/checkin" />
          ) : morningSkipped ? (
            <JourneyTaskCard icon="⚖️" label="今日晨重" status="available" variant="compact" value="已跳过" />
          ) : tooEarlyForMorning ? (
            <JourneyTaskCard icon="⚖️" label="今日晨重" status="locked" value={LOCKED_HINT_TOO_EARLY} />
          ) : inMorningWindow ? (
            <JourneyTaskCard icon="⚖️" label="今日晨重" status="available" href="/customer/checkin" actionLabel="开始 →" isNext={nextTask === "weigh"} />
          ) : (
            <JourneyTaskCard
              icon="⚖️"
              label="今日晨重"
              status="attention"
              value={skipError ?? "已错过"}
              actionSlot={
                <button
                  type="button"
                  disabled={skipping}
                  onClick={handleSkipMorning}
                  className="shrink-0 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                >
                  {skipping ? "..." : "跳过"}
                </button>
              }
            />
          )}

          {/* 2. 今日学习 — ONE-TIME (the card compresses itself once settled) */}
          {journeyActive ? (
            <TodayContentCard isNext={nextTask === "learning"} />
          ) : (
            <JourneyTaskCard icon="📚" label="今日学习" status="locked" value={lockedHint} />
          )}

          {/* 3. 饮水打卡 — CONTINUOUS: the largest interactive card, always open. */}
          <div className="col-span-2">
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

          {/* 4. 饮食打卡 — CONTINUOUS: revisited all day, never compresses. */}
          {!journeyActive ? (
            <JourneyTaskCard icon="🍽️" label="饮食打卡" status="locked" value={lockedHint} />
          ) : mealDone ? (
            <JourneyTaskCard icon="🍽️" label="饮食打卡" status="completed" value={`${addedMeals.length} 餐 · 再记一餐 →`} href="/customer/meals/add" />
          ) : (
            <JourneyTaskCard icon="🍽️" label="饮食打卡" status="available" href="/customer/meals/add" actionLabel="开始 →" isNext={nextTask === "meal"} />
          )}

          {/* 5. 今日回顾 — ONE-TIME: belongs to tonight, compresses once done. */}
          {reflectionDone ? (
            <JourneyTaskCard icon="🌙" label="今日回顾" status="completed" variant="compact" />
          ) : !journeyActive ? (
            <JourneyTaskCard icon="🌙" label="今日回顾" status="locked" value={lockedHint} />
          ) : !reflectionUnlocked ? (
            <JourneyTaskCard icon="🌙" label="今日回顾" status="locked" value={LOCKED_HINT_REFLECTION} />
          ) : (
            <JourneyTaskCard icon="🌙" label="今日回顾" status="available" href="/customer/checkout" actionLabel="开始 →" isNext={nextTask === "reflection"} />
          )}
        </div>
      </div>

      {/* Ordinary days: MISU murmurs below the tasks rather than announcing. */}
      {misuMessage && misuMessage.tier < 2 && <MisuVoiceCard message={misuMessage} />}

      {/* Yesterday's reflection — deliberately BELOW today. It's a second answer
          to "what should I do next", and it points at the past, so it must not
          compete with today in the first ten seconds. Neutral, not amber: a
          missed optional task is not a warning. */}
      {needsCatchup && (
        <Link
          href={`/customer/checkout?date=${yesterday}`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-emerald-200"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">🌙</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800">补上昨天的回顾</p>
            <p className="mt-0.5 text-xs text-slate-400">昨天的记录还可以补</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-slate-500">前往 →</span>
        </Link>
      )}
    </div>
  );
}
