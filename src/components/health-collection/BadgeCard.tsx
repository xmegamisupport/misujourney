"use client";

import { badgeIcon, BRAND } from "@/lib/health-collection/config";
import type { BadgeView } from "@/lib/health-collection/types";
import { BadgeRing } from "./BadgeRing";

/**
 * One habit on the overview — deliberately minimal: just the ring, icon and
 * name. It answers only "what have I already built?"; everything else lives in
 * the detail page. Started habits glow softly in colour; not-yet-started ones
 * are grey, so you can tell at a glance which you've begun.
 */
export function BadgeCard({ badge, onClick }: { badge: BadgeView; onClick: () => void }) {
  const started = badge.levelIndex >= 0;
  const color = started ? badge.levels[badge.levelIndex]!.color : BRAND;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center rounded-2xl px-1 py-3 text-center transition active:scale-[0.96]"
    >
      <span
        className="rounded-full"
        style={{ boxShadow: started ? `0 6px 22px -8px ${color}88` : "none" }}
      >
        <BadgeRing percent={badge.ringPercent} color={color} icon={badgeIcon(badge.def, badge.levelKey)} size={66} stroke={5} muted={!started} />
      </span>
      <p className={`mt-2 text-[12px] font-semibold leading-tight ${started ? "text-slate-700" : "text-slate-400"}`}>
        {badge.def.habitName}
      </p>
    </button>
  );
}
