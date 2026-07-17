"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useCurrentCustomerGoal } from "@/lib/goals/hooks";
import { calculateWaterTargetMl } from "@/lib/goals/goal-calculator";
import { recordJourneyBaseline } from "@/lib/baseline/engine";
import { BOWEL_HABIT_OPTIONS, HYDRATION_HABIT_OPTIONS, type BaselineOption } from "@/lib/baseline/constants";
import { cn } from "@/lib/utils";

const inputClass =
  "rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

function OptionCards({ options, value, onSelect }: { options: BaselineOption[]; value: string | null; onSelect: (code: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((o) => {
        const selected = value === o.code;
        return (
          <button
            key={o.code}
            type="button"
            onClick={() => onSelect(o.code)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition",
              selected ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-100 bg-white text-slate-600 hover:border-slate-200",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]",
                selected ? "border-emerald-400 bg-emerald-400 text-white" : "border-slate-300 text-transparent",
              )}
            >
              ✓
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function BaselineLifestylePage() {
  const router = useRouter();
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: journey } = useJourneySummary(customerId);
  const { data: currentGoal } = useCurrentCustomerGoal(customerId);

  // Personalised daily target — fixed from the REGISTRATION weight (the value
  // onboarding already stored and the Dashboard already shows). Never recomputed
  // from a fluctuating daily weight; falls back to the formula only if the goal
  // row hasn't loaded.
  const waterTargetMl = currentGoal?.waterTargetMl ?? (journey?.startWeight ? calculateWaterTargetMl(journey.startWeight) : null);

  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [bowelHabit, setBowelHabit] = useState<string | null>(null);
  const [hydrationHabit, setHydrationHabit] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = Boolean(bedtime && wakeTime && bowelHabit && hydrationHabit);

  async function handleSave() {
    if (!bowelHabit || !hydrationHabit) {
      setError("请完成上面三个问题");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await recordJourneyBaseline({ bedtime, wakeTime, bowelHabit, hydrationHabit });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "保存失败，请重试");
      return;
    }
    // Keep the customer inside the Journey Baseline flow — return to the
    // baseline hub (with updated status), not the Dashboard. They leave only
    // when both tasks are done or they explicitly choose "以后再完成".
    router.push("/customer/journey-start?saved=1");
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="了解你的生活习惯" backHref="/customer/journey-start" />

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 text-sm leading-relaxed text-slate-600">
        <p>先让我们了解你平常的生活习惯，</p>
        <p>未来才能更清楚地看见你的改变。</p>
      </div>

      {/* 1 — 睡眠 */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">😴 平常的睡眠时间</p>
        <p className="mt-1 text-xs text-slate-400">说说你平常的作息，不用是昨晚的。</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            平常大约几点入睡？
            <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            平常大约几点起床？
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className={inputClass} />
          </label>
        </div>
      </div>

      {/* 2 — 排便习惯 */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">🚽 平时有每天排便的习惯吗？</p>
        <div className="mt-4">
          <OptionCards options={BOWEL_HABIT_OPTIONS} value={bowelHabit} onSelect={setBowelHabit} />
        </div>
      </div>

      {/* 3 — 喝水习惯 */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-sky-700">
          💧 你的每日建议饮水量：<span className="font-semibold">{waterTargetMl ? `${waterTargetMl} ml` : "计算中…"}</span>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-800">平时有达到每天建议的喝水量吗？</p>
        <div className="mt-4">
          <OptionCards options={HYDRATION_HABIT_OPTIONS} value={hydrationHabit} onSelect={setHydrationHabit} />
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave || submitting}
        className="rounded-2xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
      >
        {submitting ? "保存中..." : "保存"}
      </button>

      <Link href="/customer" className="py-1 text-center text-sm font-medium text-slate-400 transition hover:text-slate-600">
        以后再完成
      </Link>
    </div>
  );
}
