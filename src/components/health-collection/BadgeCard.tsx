"use client";

import { badgeIcon, BRAND } from "@/lib/health-collection/config";
import type { BadgeView } from "@/lib/health-collection/types";
import { BadgeRing } from "./BadgeRing";

/**
 * One habit in "My Journey". Simple and premium: icon, name, current stage,
 * progress — nothing more. A habit not yet started invites 开始培养 rather than
 * reading as locked.
 */
export function BadgeCard({ badge, onClick }: { badge: BadgeView; onClick: () => void }) {
  const started = badge.levelIndex >= 0;
  const level = started ? badge.levels[badge.levelIndex] : null;
  const color = level?.color ?? BRAND;

  const progressText = !started
    ? "点亮你的第一天"
    : badge.maxed
      ? "已达成 · 继续保持"
      : `${badge.progressInLevel} / ${badge.targetInLevel} ${badge.def.unit}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center rounded-3xl border border-slate-100 bg-white px-3 py-4 text-center transition hover:border-emerald-100 hover:shadow-sm active:scale-[0.98]"
    >
      <BadgeRing percent={badge.ringPercent} color={color} icon={badgeIcon(badge.def, badge.levelKey)} />

      <p className="mt-2.5 text-sm font-semibold text-slate-800">{badge.def.habitName}</p>

      {!started ? (
        <span className="mt-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
          开始培养
        </span>
      ) : (
        <span
          className="mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: level!.soft, color: level!.color }}
        >
          {level!.name}
        </span>
      )}

      <p className="mt-1.5 text-[11px] font-medium tabular-nums text-slate-400">{progressText}</p>
    </button>
  );
}
