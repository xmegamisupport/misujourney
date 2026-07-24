"use client";

import { useCallback, useEffect, useState } from "react";
import { resolveLevel } from "./calc";
import { BADGES, badgeIcon, getBadgeLevels } from "./config";
import { fetchBadgeData } from "./data";
import { buildGlow } from "./glow";
import type { BadgeUpgrade, BadgeView, GlowMessage, GlowSummary } from "./types";

const EMPTY_GLOW: { summary: GlowSummary; message: GlowMessage } = {
  summary: { habitsBuilt: 0, actionsCompleted: 0, longestStreak: 0 },
  message: { headline: "", sub: "" },
};

const ACK_KEY = (customerId: string) => `misu:hc:ack:${customerId}`;

/** Read the per-badge acknowledged level indices from localStorage. */
function readAck(customerId: string): Record<string, number> | null {
  try {
    const raw = window.localStorage.getItem(ACK_KEY(customerId));
    return raw ? (JSON.parse(raw) as Record<string, number>) : null;
  } catch {
    return null;
  }
}

function writeAck(customerId: string, map: Record<string, number>) {
  try {
    window.localStorage.setItem(ACK_KEY(customerId), JSON.stringify(map));
  } catch {
    /* non-fatal */
  }
}

/**
 * Load the customer's Health Collection: every badge resolved to its level and
 * progress, plus any level-ups to celebrate since the last visit.
 *
 * Level-up detection is client-side and idempotent: the first ever load records
 * current levels WITHOUT firing popups (so existing progress isn't celebrated
 * retroactively); later loads only celebrate a genuine increase.
 */
export function useHealthCollection(customerId: string) {
  const [badges, setBadges] = useState<BadgeView[]>([]);
  const [glow, setGlow] = useState(EMPTY_GLOW);
  const [upgrades, setUpgrades] = useState<BadgeUpgrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const data = await fetchBadgeData(customerId);
      if (cancelled) return;

      const views: BadgeView[] = BADGES.map((def) => {
        const levels = getBadgeLevels(def);
        const c = def.compute(data);
        return {
          def,
          levels,
          firstDate: c.firstDate ?? null,
          ...resolveLevel(c.lifetime, c.streak, levels),
        };
      });

      // Level-up detection vs acknowledged levels.
      const prevAck = readAck(customerId);
      const nextAck: Record<string, number> = {};
      const found: BadgeUpgrade[] = [];
      for (const v of views) {
        nextAck[v.def.id] = v.levelIndex;
        if (prevAck && v.levelIndex > (prevAck[v.def.id] ?? -1) && v.levelKey) {
          const level = v.levels[v.levelIndex];
          if (level) found.push({ badgeId: v.def.id, title: v.def.habitName, icon: badgeIcon(v.def, level.key), level });
        }
      }
      writeAck(customerId, nextAck);

      setBadges(views);
      setGlow(buildGlow(views));
      setUpgrades(prevAck ? found : []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const dismissUpgrade = useCallback(() => setUpgrades((q) => q.slice(1)), []);

  return {
    badges,
    loading,
    summary: glow.summary,
    message: glow.message,
    upgrade: upgrades[0] ?? null,
    dismissUpgrade,
  };
}
