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
      <div className="misu-rise relative w-full max-w-sm overflow-hidden rounded-card border border-white/70 bg-gradient-to-b from-brand-tint via-white to-[#f0ece9] px-7 py-9 text-center shadow-elev2">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-soft/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-48 w-48 rounded-full bg-brand-tint blur-3xl" />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-deep">🌸 Glowing You</p>
          <h1 className="mt-4 whitespace-pre-line text-lg font-bold leading-relaxed text-ink">
            {message.headline}
          </h1>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <Metric emoji="🌱" value={summary.habitsBuilt} label="健康习惯" />
            <Metric emoji="🏆" value={summary.actionsCompleted} label="成长行动" />
            <Metric emoji="🔥" value={summary.longestStreak} suffix="Days" label="连续坚持" />
          </div>

          <p className="mt-7 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            今天的你，已经比昨天更健康一点。{"\n"}每一个健康的选择，都在带你靠近更健康的未来。
          </p>

          <button
            type="button"
            onClick={onView}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-brand to-brand-deep py-3.5 text-sm font-semibold text-white shadow-brand transition duration-500 ease-soft hover:-translate-y-0.5 active:scale-[0.99]"
          >
            查看我的旅程 →
          </button>
          <button
            type="button"
            onClick={onLater}
            className="mt-2 w-full py-2 text-xs font-medium text-ink-faint transition hover:text-ink-soft"
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
    <div className="rounded-lg border border-white/60 bg-surface/70 px-1.5 py-4 shadow-elev1 backdrop-blur-sm">
      <div className="text-base leading-none">{emoji}</div>
      <div className="mt-2 leading-none text-ink">
        <span className="text-3xl font-extrabold tabular-nums">{value}</span>
        {suffix && <span className="ml-0.5 text-xs font-semibold text-ink-faint">{suffix}</span>}
      </div>
      <div className="mt-1.5 text-[10px] text-ink-soft">{label}</div>
    </div>
  );
}
