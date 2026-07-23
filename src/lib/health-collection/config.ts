import { longestConsecutive, longestStreak } from "./calc";
import type { BadgeDef, LevelDef, LevelKey } from "./types";

/**
 * The shared habit-level ladder. A habit doesn't "rank up" — it gradually
 * becomes part of your life, so the names describe personal growth, not game
 * tiers. Thresholds are CUMULATIVE completions (never consecutive), so a missed
 * day never costs progress. All of it is config — re-tuning is editing this
 * array.
 *
 * Colours stay in the MISU brand (a calm emerald that deepens slightly as the
 * habit strengthens) — deliberately NOT bronze/silver/gold/rainbow, which would
 * read as an arcade ranking.
 */
export const LEVELS: LevelDef[] = [
  { key: "beginner", threshold: 1, name: "Beginner", color: "#5ec8a0", soft: "#ecfdf5" },
  { key: "builder", threshold: 15, name: "Builder", color: "#34c08c", soft: "#e7faf1" },
  { key: "progress", threshold: 30, name: "Progress", color: "#12b981", soft: "#e2f7ee" },
  { key: "achiever", threshold: 60, name: "Achiever", color: "#0ea472", soft: "#def4ea" },
  { key: "elite", threshold: 120, name: "Elite", color: "#0b8a60", soft: "#d8f0e4" },
  { key: "master", threshold: 365, name: "Master", color: "#05704b", soft: "#d2ecdf" },
];

/** MISU brand emerald, used for the ring track / accents everywhere. */
export const BRAND = "#10b981";

/**
 * The six Phase-1 Master Badges — a fixed order matching the daily Journey
 * (never sorted alphabetically). Titles stay English; descriptions are short
 * Chinese. Each is verified automatically from data MISU already stores;
 * `compute` is pure. Adding a badge later = one more entry.
 */
export const BADGES: BadgeDef[] = [
  {
    id: "water",
    icon: "💧",
    title: "Water Master",
    description: "每天达成饮水目标，\n养成规律喝水的好习惯。",
    trackStreak: true,
    compute: (d) => ({ lifetime: d.waterDates.length, streak: longestStreak(d.waterDates) }),
  },
  {
    id: "weight",
    icon: "⚖️",
    title: "Weight Master",
    description: "坚持每天晨间称重，\n让身体的变化被看见。",
    trackStreak: true,
    compute: (d) => ({ lifetime: d.weighInDates.length, streak: longestStreak(d.weighInDates) }),
  },
  {
    id: "meal_n_plus",
    icon: "🍵",
    title: "Meal Routine Master",
    description: "坚持每一次 MISU N+ 打卡，\n让营养成为日常。",
    trackStreak: false,
    compute: (d) => ({ lifetime: d.sachetUsed.MISU_N_PLUS ?? 0, streak: 0 }),
  },
  {
    id: "detox_dx_plus",
    icon: "🌿",
    title: "Detox Routine Master",
    description: "坚持每一次 MISU DX+ 打卡，\n让身体轻盈无负担。",
    trackStreak: false,
    compute: (d) => ({ lifetime: d.sachetUsed.MISU_DX_PLUS ?? 0, streak: 0 }),
  },
  {
    id: "learning",
    icon: "📚",
    title: "Learning Master",
    description: "完成每天的今日学习，\n一点点更懂自己的身体。",
    trackStreak: true,
    compute: (d) => ({ lifetime: d.learningDays.length, streak: longestConsecutive(d.learningDays) }),
  },
  {
    id: "consistency",
    icon: "🔥",
    title: "Consistency Master",
    description: "完成属于你的每日 Journey，\n把自律活成习惯。",
    trackStreak: true,
    compute: (d) => ({
      lifetime: new Set(d.dailyCompleteDates).size,
      streak: longestStreak(d.dailyCompleteDates),
    }),
  },
];

export function getBadgeLevels(def: BadgeDef): LevelDef[] {
  return def.levels ?? LEVELS;
}

/**
 * Resolve the icon for a badge at a given habit level. Falls back to the
 * badge's default icon — so per-level icons can be added later with zero code
 * changes to the components.
 */
export function badgeIcon(def: BadgeDef, levelKey: LevelKey | null): string {
  if (levelKey && def.levelIcons?.[levelKey]) return def.levelIcons[levelKey]!;
  return def.icon;
}
