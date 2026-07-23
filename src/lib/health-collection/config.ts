import { longestConsecutive, longestStreak } from "./calc";
import type { BadgeDef, LevelDef } from "./types";

/**
 * The shared level ladder. Every Master Badge upgrades along this path forever.
 * Thresholds are CUMULATIVE completions (never consecutive), so a missed day
 * never costs progress. All of it is config — re-tuning is editing this array.
 */
export const LEVELS: LevelDef[] = [
  { key: "bronze", threshold: 1, name: "青铜", color: "#b0763f", soft: "#f5ece2" },
  { key: "silver", threshold: 15, name: "白银", color: "#8c98a6", soft: "#eef1f4" },
  { key: "gold", threshold: 30, name: "黄金", color: "#c99a2e", soft: "#f8f0d9" },
  { key: "platinum", threshold: 60, name: "铂金", color: "#4f9aa8", soft: "#e6f2f3" },
  { key: "diamond", threshold: 120, name: "钻石", color: "#4bb8d6", soft: "#e3f5fa" },
  { key: "legend", threshold: 365, name: "传奇", color: "#8a63c4", soft: "#f0eafa" },
];

/**
 * The six Phase-1 Master Badges. Each is verified automatically from data MISU
 * already stores; `compute` is pure and derives the cumulative count + streak
 * from the raw, read-only aggregates. Adding a badge later = one more entry.
 */
export const BADGES: BadgeDef[] = [
  {
    id: "water",
    icon: "💧",
    title: "饮水大师",
    description: "每天达成你的饮水目标，养成 hydration 习惯。",
    trackStreak: true,
    compute: (d) => ({ lifetime: d.waterDates.length, streak: longestStreak(d.waterDates) }),
  },
  {
    id: "weight",
    icon: "⚖️",
    title: "晨称大师",
    description: "坚持每天晨间称重，让身体的变化被看见。",
    trackStreak: true,
    compute: (d) => ({ lifetime: d.weighInDates.length, streak: longestStreak(d.weighInDates) }),
  },
  {
    id: "meal_n_plus",
    icon: "🍵",
    title: "餐律大师",
    description: "坚持每一次 MISU N+ 冲剂打卡。",
    trackStreak: false,
    compute: (d) => ({ lifetime: d.sachetUsed.MISU_N_PLUS ?? 0, streak: 0 }),
  },
  {
    id: "detox_dx_plus",
    icon: "🌿",
    title: "净享大师",
    description: "坚持每一次 MISU DX+ 冲剂打卡。",
    trackStreak: false,
    compute: (d) => ({ lifetime: d.sachetUsed.MISU_DX_PLUS ?? 0, streak: 0 }),
  },
  {
    id: "learning",
    icon: "📚",
    title: "学习大师",
    description: "完成每天的今日学习，一点点更懂自己的身体。",
    trackStreak: true,
    compute: (d) => ({ lifetime: d.learningDays.length, streak: longestConsecutive(d.learningDays) }),
  },
  {
    id: "consistency",
    icon: "🔥",
    title: "自律大师",
    description: "完成属于你的每日 Journey —— 最重要的一枚徽章。",
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
