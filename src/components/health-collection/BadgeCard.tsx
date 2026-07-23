"use client";

import type { BadgeView } from "@/lib/health-collection/types";
import { BadgeRing } from "./BadgeRing";

/** One badge in the collection grid. Icon ring, name, level, progress — nothing
 * else, per the minimal Apple-Fitness-meets-collection brief. */
export function BadgeCard({ badge, onClick }: { badge: BadgeView; onClick: () => void }) {
  const level = badge.levelKey ? badge.levels[badge.levelIndex] : null;
  const color = level?.color ?? "#9aa4ad";
  const locked = badge.levelIndex < 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center rounded-3xl border border-slate-100 bg-white px-3 py-4 text-center transition hover:border-slate-200 hover:shadow-sm active:scale-[0.98]"
    >
      <BadgeRing percent={badge.ringPercent} color={color} icon={badge.def.icon} locked={locked} />

      <p className="mt-2.5 text-sm font-semibold text-slate-800">{badge.def.title}</p>

      {locked ? (
        <span className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
          未解锁
        </span>
      ) : (
        <span
          className="mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: level!.soft, color: level!.color }}
        >
          {level!.name}
        </span>
      )}

      <p className="mt-1.5 text-[11px] font-medium tabular-nums text-slate-400">
        {badge.maxed ? "已达最高" : `${badge.progressInLevel} / ${badge.targetInLevel}`}
      </p>
    </button>
  );
}
