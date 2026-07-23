"use client";

import type { GlowMessage, GlowSummary } from "@/lib/health-collection/types";

/**
 * The Growth Card — the first thing you see in Glowing You. Not a dashboard:
 * an award you receive. Emotion before information, and beautiful enough to want
 * to screenshot. The three numbers are quiet evidence; the words do the work.
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
        {/* soft glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-48 w-48 rounded-full bg-rose-200/40 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-medium tracking-wide text-emerald-600">🌸 Glowing You</p>
          <h1 className="mt-4 whitespace-pre-line text-lg font-bold leading-relaxed text-slate-800">
            {message.headline}
          </h1>

          <p className="mt-5 text-xs font-medium uppercase tracking-widest text-slate-400">
            一路走来
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Metric emoji="🌱" value={summary.habitsBuilt} label="养成的习惯" />
            <Metric emoji="🏆" value={summary.actionsCompleted} label="健康行动" />
            <Metric emoji="🔥" value={summary.longestStreak} label="最长连续" />
          </div>

          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-500">
            ❤️ 你正在成为更强大的自己。{"\n"}每一个健康的选择都算数，继续闪耀。
          </p>
          {message.sub && <p className="mt-2 text-xs text-emerald-600/90">{message.sub}</p>}

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

function Metric({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-2 py-3">
      <div className="text-lg leading-none">{emoji}</div>
      <div className="mt-1.5 text-2xl font-extrabold tabular-nums text-slate-900">{value}</div>
      <div className="mt-0.5 text-[10px] leading-tight text-slate-400">{label}</div>
    </div>
  );
}
