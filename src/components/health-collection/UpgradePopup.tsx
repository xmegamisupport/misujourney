"use client";

import type { BadgeUpgrade } from "@/lib/health-collection/types";
import { BadgeRing } from "./BadgeRing";

/** Celebration shown when a badge reaches a new level. Elegant, not arcade:
 * a soft burst of the level colour, the badge scaling in, and one line. */
export function UpgradePopup({ upgrade, onDismiss }: { upgrade: BadgeUpgrade; onDismiss: () => void }) {
  const { level } = upgrade;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <style>{`
        @keyframes hcPop { 0% { transform: scale(.7); opacity: 0 } 60% { transform: scale(1.06) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes hcGlow { 0% { transform: scale(.6); opacity: .0 } 40% { opacity: .55 } 100% { transform: scale(1.5); opacity: 0 } }
        @media (prefers-reduced-motion: reduce){ .hc-anim { animation: none !important } }
      `}</style>
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative flex w-full max-w-xs flex-col items-center rounded-3xl bg-white px-6 py-8 text-center shadow-2xl">
        <div className="relative flex items-center justify-center">
          <span
            className="hc-anim absolute h-32 w-32 rounded-full"
            style={{ background: level.color, animation: "hcGlow 1.1s ease-out forwards" }}
          />
          <span className="hc-anim block" style={{ animation: "hcPop .5s ease-out forwards" }}>
            <BadgeRing percent={1} color={level.color} icon={upgrade.icon} size={120} stroke={9} />
          </span>
        </div>

        <p className="mt-4 text-xs font-medium uppercase tracking-widest text-slate-400">Habit Strengthened</p>
        <p className="mt-1 text-lg font-bold text-slate-900">{upgrade.title}</p>
        <p className="mt-0.5 text-sm text-slate-500">已成长到</p>
        <p className="mt-1 text-2xl font-extrabold" style={{ color: level.color }}>
          {level.name}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-2xl py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
          style={{ backgroundColor: level.color }}
        >
          继续保持
        </button>
      </div>
    </div>
  );
}
