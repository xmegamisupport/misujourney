"use client";

import { useEffect } from "react";
import type { BadgeView } from "@/lib/health-collection/types";
import { BadgeRing } from "./BadgeRing";

/** Bottom sheet with a badge's full detail: level, lifetime, streak, next
 * level, and the full ladder it keeps climbing. */
export function BadgeDetailSheet({ badge, onClose }: { badge: BadgeView | null; onClose: () => void }) {
  useEffect(() => {
    if (!badge) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [badge, onClose]);

  if (!badge) return null;
  const level = badge.levelKey ? badge.levels[badge.levelIndex] : null;
  const color = level?.color ?? "#9aa4ad";
  const next = badge.nextKey ? badge.levels[badge.levelIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-8 shadow-xl sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex flex-col items-center text-center">
          <BadgeRing percent={badge.ringPercent} color={color} icon={badge.def.icon} size={116} stroke={8} locked={badge.levelIndex < 0} />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">{badge.def.title}</h2>
          {level ? (
            <span className="mt-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: level.soft, color: level.color }}>
              {level.name}
            </span>
          ) : (
            <span className="mt-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400">未解锁</span>
          )}
          <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-slate-500">{badge.def.description}</p>
        </div>

        {/* stats */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="累计" value={`${badge.lifetime}`} />
          {badge.def.trackStreak ? (
            <Stat label="最高连续" value={`${badge.streak} 天`} />
          ) : (
            <Stat label="当前等级" value={level?.name ?? "—"} />
          )}
          <Stat label={badge.maxed ? "已满级" : "距下一级"} value={badge.maxed ? "✓" : `${badge.remaining}`} />
        </div>

        {/* next level */}
        {next && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-xs text-slate-500">下一级</span>
            <span className="text-sm font-semibold" style={{ color: next.color }}>
              {next.name} · 还需 {badge.remaining}
            </span>
          </div>
        )}

        {/* ladder */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            {badge.levels.map((lv, i) => {
              const reached = i <= badge.levelIndex;
              return (
                <div key={lv.key} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: reached ? lv.color : "#eef1f4",
                      color: reached ? "#fff" : "#adb5bd",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[9px] font-medium" style={{ color: reached ? lv.color : "#adb5bd" }}>
                    {lv.name}
                  </span>
                </div>
              );
            })}
          </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2 py-3 text-center">
      <p className="text-base font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{label}</p>
    </div>
  );
}
