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
      className="group flex flex-col items-center gap-2 rounded-lg border border-line bg-surface px-1 py-3.5 text-center shadow-elev1 transition duration-500 ease-soft hover:-translate-y-0.5 active:scale-[0.97]"
    >
      <span
        className="rounded-full"
        style={{ boxShadow: started ? `0 6px 22px -8px ${color}88` : "none" }}
      >
        <BadgeRing percent={badge.ringPercent} color={color} icon={badgeIcon(badge.def, badge.levelKey)} size={62} stroke={5} muted={!started} />
      </span>
      <p className={`text-[12px] font-semibold leading-tight ${started ? "text-ink" : "text-ink-faint"}`}>
        {badge.def.habitName}
      </p>
    </button>
  );
}
