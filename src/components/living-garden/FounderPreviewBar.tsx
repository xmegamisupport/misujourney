"use client";

import type { GardenPreviewController } from "@/lib/living-garden/hooks";

/** Founder preview tool — scrub Day 1–35 and autoplay the whole growth.
 *
 * A review instrument for pacing, not part of the customer experience. It lives
 * inside the scene this sprint so the framework can be checked at a glance;
 * gate it behind a founder flag once the pacing is signed off (this component
 * is the only thing that would need hiding — nothing else knows about days).
 */
export function FounderPreviewBar({ controller }: { controller: GardenPreviewController }) {
  const { day, lastDay, playing, setDay, next, prev, togglePlay } = controller;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 bg-white/85 px-4 py-2.5 backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Founder Preview</span>
        <span className="text-xs font-semibold text-emerald-600">
          Day {day} <span className="font-normal text-slate-400">/ {lastDay}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-3 text-xs font-semibold text-white active:scale-95"
        >
          {playing ? "⏸ 暂停" : "▶ 播放"}
        </button>
        <button type="button" aria-label="上一天" onClick={prev} className="h-8 w-8 shrink-0 rounded-full border border-slate-200 text-sm">
          ‹
        </button>
        <input
          type="range"
          min={1}
          max={lastDay}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          aria-label="预览天数"
          className="h-8 min-w-0 flex-1 accent-emerald-500"
        />
        <button type="button" aria-label="下一天" onClick={next} className="h-8 w-8 shrink-0 rounded-full border border-slate-200 text-sm">
          ›
        </button>
      </div>
    </div>
  );
}
