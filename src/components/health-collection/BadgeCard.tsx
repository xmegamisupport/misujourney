"use client";

import { badgeIcon, BRAND } from "@/lib/health-collection/config";
import type { BadgeView } from "@/lib/health-collection/types";
import { BadgeRing } from "./BadgeRing";

/**
 * One habit in "My Journey" — compact and premium so almost all six fit on one
 * screen. Ring, name, current stage, current progress. Nothing more. A habit
 * not yet started invites 开始培养 rather than reading as locked.
 */
export function BadgeCard({ badge, onClick }: { badge: BadgeView; onClick: () => void }) {
  const started = badge.levelIndex >= 0;
  const level = started ? badge.levels[badge.levelIndex] : null;
  const color = level?.color ?? BRAND;

  const progressText = !started
    ? "开始培养"
    : badge.maxed
      ? "已达成"
      : `${badge.progressInLevel} / ${badge.targetInLevel} ${badge.def.unit}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white px-2 py-3 text-center transition hover:border-emerald-100 hover:shadow-sm active:scale-[0.98]"
    >
      <BadgeRing percent={badge.ringPercent} color={color} icon={badgeIcon(badge.def, badge.levelKey)} size={58} stroke={5} />
      <p className="mt-2 text-[13px] font-semibold leading-tight text-slate-800">{badge.def.habitName}</p>
      <p className="mt-0.5 text-[11px] font-semibold" style={{ color: started ? color : "#94a3b8" }}>
        {started ? level!.name : "未开始"}
      </p>
      <p className="mt-0.5 text-[10px] font-medium tabular-nums text-slate-400">{progressText}</p>
    </button>
  );
}
