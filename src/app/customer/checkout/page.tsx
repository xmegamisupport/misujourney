"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { todayDateStr, yesterdayDateStr } from "@/lib/inventory/engine";
import { useCheckoutForDate } from "@/lib/checkout/hooks";
import { submitEveningCheckout } from "@/lib/checkout/engine";
import { BOWEL_MOVEMENT_LABELS, SPECIAL_CONDITION_OPTIONS, REFLECTION_UNLOCK_HOUR } from "@/lib/checkout/constants";
import { useLocalHour } from "@/lib/useLocalHour";
import type { BowelMovementLevel, SpecialCondition } from "@/lib/checkout/types";
import { useCurrentCustomerGoal } from "@/lib/goals/hooks";
import { buildCustomerTrendSummary, syncAttentionFlags } from "@/lib/insights/summary";
import { createClient } from "@/lib/supabase/client";
import { useTodayJourneyDay } from "@/lib/journey-day/hooks";
import { cn } from "@/lib/utils";

function formatMonthDay(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export default function EveningCheckoutPage() {
  return (
    <Suspense>
      <EveningCheckoutForm />
    </Suspense>
  );
}

function EveningCheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";

  const today = todayDateStr();
  const yesterday = yesterdayDateStr();
  const isMakeUp = searchParams.get("date") === yesterday;
  const targetDate = isMakeUp ? yesterday : today;

  const { data: existing, loading } = useCheckoutForDate(customerId, targetDate);
  const { data: currentGoal } = useCurrentCustomerGoal(customerId);
  // Yesterday's make-up checkout must always stay reachable regardless of
  // whether today's journey has started; only today's own checkout needs
  // today's Journey Day to already be active.
  const { data: todayJourney, loading: journeyLoading } = useTodayJourneyDay(customerId, today);
  const journeyActive = (todayJourney?.status ?? "waiting_for_morning") === "active";
  const blockedByJourney = !isMakeUp && !journeyLoading && !journeyActive;
  // Today's reflection is a real evening feature — gated here too, not only on
  // the Dashboard card, so the two can't disagree. Yesterday's make-up is exempt.
  const localHour = useLocalHour();
  const blockedByTime = !isMakeUp && localHour !== null && localHour < REFLECTION_UNLOCK_HOUR;

  const [bowelMovement, setBowelMovement] = useState<BowelMovementLevel | "">("");
  const [conditions, setConditions] = useState<SpecialCondition[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already completed for this date (e.g. a stale link, or opened twice) —
  // nothing left to fill in, so bounce straight back to the dashboard.
  useEffect(() => {
    if (!loading && existing) {
      router.replace("/customer");
    }
  }, [loading, existing, router]);

  function toggleCondition(value: SpecialCondition) {
    setConditions((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  async function handleSubmit() {
    if (!bowelMovement) {
      setError(isMakeUp ? "请选择昨天排便情况" : "请选择今天排便情况");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await submitEveningCheckout({
      customerId,
      date: targetDate,
      bowelMovement,
      specialConditions: conditions,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "提交失败，请重试");
      return;
    }

    // Attention flags are cheap (no AI) — refresh them right away so a Coach
    // sees up-to-date tags without waiting for the next AI-summary
    // generation. Best-effort: a failure here shouldn't block the customer
    // from returning to the dashboard after a successful checkout.
    try {
      const supabase = createClient();
      const summary = await buildCustomerTrendSummary(supabase, customerId, { periodDays: 7, waterTargetMl: currentGoal?.waterTargetMl ?? 2000 });
      await syncAttentionFlags(supabase, customerId, summary);
    } catch (err) {
      console.error("Failed to refresh attention flags", err);
    }

    router.push("/customer");
  }

  // Hold until the real local hour is known, so the evening gate never flashes
  // the wrong state during hydration.
  if (loading || existing || (!isMakeUp && (journeyLoading || localHour === null))) {
    return <div className="px-4 py-10 text-center text-sm text-slate-400">加载中...</div>;
  }

  if (blockedByJourney) {
    return (
      <div className="px-4 py-10 md:px-8">
        <PageHeader title="🌙 今日回顾" backHref="/customer" />
        <EmptyState
          icon="🌱"
          title="今天的 Journey 还没开始"
          description="请先回到首页完成或跳过晨重，今天结束后再来完成今日回顾。"
        />
      </div>
    );
  }

  if (blockedByTime) {
    return (
      <div className="px-4 py-10 md:px-8">
        <PageHeader title="🌙 今日回顾" backHref="/customer" />
        <EmptyState
          icon="🌙"
          title="今日回顾会在每天晚上开放"
          description={`今天还在进行中，先好好过完这一天。晚上 ${REFLECTION_UNLOCK_HOUR}:00 后再回来，花一点时间回顾今天，为今天的 Journey 收尾。`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title={isMakeUp ? `补充${formatMonthDay(targetDate)}回顾` : "🌙 今日回顾"} backHref="/customer" />

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">{isMakeUp ? "昨天排便几次？" : "今天排便几次？"}</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(BOWEL_MOVEMENT_LABELS) as [BowelMovementLevel, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBowelMovement(value)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-sm font-medium transition",
                    bowelMovement === value ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-500 hover:border-slate-200",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">
              {isMakeUp ? "昨天有没有特殊情况？" : "今天有没有特殊情况？"}<span className="font-normal text-slate-400">（可多选）</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SPECIAL_CONDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleCondition(opt.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                    conditions.includes(opt.value) ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-500 hover:border-slate-200",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">
              {isMakeUp ? "昨天备注" : "今日备注"}<span className="font-normal text-slate-400">（可选）</span>
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="例如：今天吃比较多 / 今天身体不舒服 / 今天工作很忙"
              className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {submitting ? "提交中..." : "完成回顾"}
          </button>
        </div>
      </div>
    </div>
  );
}
