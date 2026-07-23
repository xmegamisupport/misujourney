"use client";

import { useEffect } from "react";
import { badgeIcon, BRAND } from "@/lib/health-collection/config";
import type { BadgeView } from "@/lib/health-collection/types";
import { BadgeRing } from "./BadgeRing";

/** Bottom sheet with a habit's full detail. Terminology reinforces that a habit
 * is getting stronger — Habit Level, Next Stage, Completions — not a game rank. */
export function BadgeDetailSheet({ badge, onClose }: { badge: BadgeView | null; onClose: () => void }) {
  useEffect(() => {
    if (!badge) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [badge, onClose]);

  if (!badge) return null;
  const started = badge.levelIndex >= 0;
  const level = started ? badge.levels[badge.levelIndex] : null;
  const color = level?.color ?? BRAND;
  const next = badge.nextKey ? badge.levels[badge.levelIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-8 shadow-xl sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex flex-col items-center text-center">
          <BadgeRing percent={badge.ringPercent} color={color} icon={badgeIcon(badge.def, badge.levelKey)} size={116} stroke={8} />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">{badge.def.title}</h2>
          {started ? (
            <span className="mt-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: level!.soft, color: level!.color }}>
              {level!.name}
            </span>
          ) : (
            <span className="mt-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
              Start Building
            </span>
          )}
          <p className="mt-2.5 max-w-xs whitespace-pre-line text-sm leading-relaxed text-slate-500">
            {badge.def.description}
          </p>
        </div>

        {/* detail list */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <Row label="Habit Level" value={started ? level!.name : "Start Building"} valueColor={color} />
          <Row label="Lifetime Progress" value={plural(badge.lifetime, "Completion")} />
          {badge.def.trackStreak && <Row label="Highest Streak" value={plural(badge.streak, "Day")} />}
          <Row label="Next Stage" value={next ? next.name : "—"} valueColor={next?.color} />
          {!badge.maxed && <Row label="Remaining" value={plural(badge.remaining, "Completion")} last />}
        </div>

        {/* habit ladder */}
        <div className="mt-5 flex items-center justify-between">
          {badge.levels.map((lv, i) => {
            const reached = i <= badge.levelIndex;
            return (
              <div key={lv.key} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: reached ? lv.color : "#e6ebe9" }}
                />
                <span className="text-[9px] font-medium" style={{ color: reached ? lv.color : "#b6bdc2" }}>
                  {lv.name}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
        >
          完成
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${last ? "" : "border-b border-slate-100"}`}>
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold" style={{ color: valueColor ?? "#0f172a" }}>
        {value}
      </span>
    </div>
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
