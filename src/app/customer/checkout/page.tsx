"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { todayDateStr, yesterdayDateStr } from "@/lib/inventory/engine";
import { useCheckoutForDate } from "@/lib/checkout/hooks";
import { submitEveningCheckout } from "@/lib/checkout/engine";
import { BOWEL_MOVEMENT_LABELS, SPECIAL_CONDITION_OPTIONS } from "@/lib/checkout/constants";
import type { BowelMovementLevel, SpecialCondition } from "@/lib/checkout/types";
import { cn } from "@/lib/utils";

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
      setError("请选择今日排便情况");
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
    router.push("/customer");
  }

  if (loading || existing) {
    return <div className="px-4 py-10 text-center text-sm text-slate-400">加载中...</div>;
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title={isMakeUp ? "补填昨天的睡前回顾" : "🌙 睡前回顾"} backHref="/customer" />

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">今日排便</p>
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
              今天有没有特殊情况？<span className="font-normal text-slate-400">（可多选）</span>
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
              今日备注<span className="font-normal text-slate-400">（可选）</span>
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
