"use client";

import type { GlowMessage, GlowSummary } from "@/lib/health-collection/types";

/**
 * The Growth Card — the first thing you see in Glowing You. Not a dashboard:
 * an award you receive. The three numbers are the visual focus (big, quiet
 * evidence that you're growing); the words do the emotional work. Beautiful
 * enough to want to screenshot.
 */
export function GrowthCard({
  summary,
  message,
  onView,
  onLater,
}: {
  summary: GlowSummary;
  message: GlowMessage;
  onView: () => void;
  onLater: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-6">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-b from-rose-50 via-white to-emerald-50 px-7 py-9 text-center shadow-[0_20px_60px_-20px_rgba(16,185,129,0.35)]">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-48 w-48 rounded-full bg-rose-200/40 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-medium tracking-wide text-emerald-600">🌸 Glowing You</p>
          <h1 className="mt-4 whitespace-pre-line text-lg font-bold leading-relaxed text-slate-800">
            {message.headline}
          </h1>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <Metric emoji="🌱" value={summary.habitsBuilt} label="健康习惯" />
            <Metric emoji="🏆" value={summary.actionsCompleted} label="成长行动" />
            <Metric emoji="🔥" value={summary.longestStreak} suffix="Days" label="连续坚持" />
          </div>

          <p className="mt-7 whitespace-pre-line text-sm leading-relaxed text-slate-500">
            今天的你，已经比昨天更健康一点。{"\n"}每一个健康的选择，都在带你靠近更健康的未来。
          </p>

          <button
            type="button"
            onClick={onView}
            className="mt-7 w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.99]"
          >
            查看我的旅程 →
          </button>
          <button
            type="button"
            onClick={onLater}
            className="mt-2 w-full py-2 text-xs font-medium text-slate-400 transition hover:text-slate-600"
          >
            稍后再看
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({
  emoji,
  value,
  label,
  suffix,
}: {
  emoji: string;
  value: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/70 px-1.5 py-4">
      <div className="text-base leading-none">{emoji}</div>
      <div className="mt-2 leading-none text-slate-900">
        <span className="text-3xl font-extrabold tabular-nums">{value}</span>
        {suffix && <span className="ml-0.5 text-xs font-semibold text-slate-400">{suffix}</span>}
      </div>
      <div className="mt-1.5 text-[10px] text-slate-400">{label}</div>
    </div>
  );
}
