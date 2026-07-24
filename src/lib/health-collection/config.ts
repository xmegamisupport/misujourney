import { earliest, longestConsecutive, longestStreak } from "./calc";
import type { BadgeDef, LevelDef, LevelKey, SecretAchievement } from "./types";

/**
 * The shared habit-level ladder. A habit doesn't "rank up" — it gradually
 * becomes part of your life, so the names describe personal growth, not game
 * tiers. Thresholds are CUMULATIVE completions (never consecutive), so a missed
 * day never costs progress. All of it is config — re-tuning is editing this
 * array.
 *
 * Colours stay in the MISU brand (a calm emerald that deepens slightly as the
 * habit strengthens) — deliberately NOT bronze/silver/gold/rainbow.
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
 * The six Phase-1 habits — a fixed order matching the daily Journey. Verified
 * automatically from data MISU already stores; `compute` is pure. Adding a
 * habit later = one more entry.
 */
export const BADGES: BadgeDef[] = [
  {
    id: "water",
    icon: "💧",
    title: "Water Champion",
    habitName: "喝水达人",
    unit: "天",
    description: "培养每天喝足水的习惯，\n让健康慢慢成为生活方式。",
    quote: "每一杯水，都是给未来自己的投资。",
    trackStreak: true,
    compute: (d) => ({
      lifetime: d.waterDates.length,
      streak: longestStreak(d.waterDates),
      firstDate: earliest(d.waterDates),
    }),
  },
  {
    id: "weight",
    icon: "⚖️",
    title: "Weight Champion",
    habitName: "称重达人",
    unit: "天",
    description: "每天早晨记录体重，\n温柔地看见身体的变化。",
    quote: "记录体重，不是为了焦虑，\n而是为了看见自己的努力。",
    trackStreak: true,
    compute: (d) => ({
      lifetime: d.weighInDates.length,
      streak: longestStreak(d.weighInDates),
      firstDate: earliest(d.weighInDates),
    }),
  },
  {
    id: "meal_n_plus",
    icon: "🍵",
    title: "Meal Champion",
    habitName: "营养达人",
    unit: "次",
    description: "让 MISU N+ 成为每天的营养习惯，\n一点一点照顾好自己。",
    quote: "好好吃饭，是最长情的自我照顾。",
    trackStreak: false,
    compute: (d) => ({ lifetime: d.sachetUsed.MISU_N_PLUS ?? 0, streak: 0, firstDate: null }),
  },
  {
    id: "detox_dx_plus",
    icon: "🌿",
    title: "Detox Champion",
    habitName: "净享达人",
    unit: "次",
    description: "让 MISU DX+ 成为每天的净享习惯，\n轻盈无负担地生活。",
    quote: "给身体减负，也是给生活留白。",
    trackStreak: false,
    compute: (d) => ({ lifetime: d.sachetUsed.MISU_DX_PLUS ?? 0, streak: 0, firstDate: null }),
  },
  {
    id: "learning",
    icon: "📚",
    title: "Learning Champion",
    habitName: "学习达人",
    unit: "天",
    description: "每天读一点、懂一点，\n慢慢更了解自己的身体。",
    quote: "今天学到的一点点，\n会变成明天更好的选择。",
    trackStreak: true,
    compute: (d) => ({
      lifetime: d.learningDays.length,
      streak: longestConsecutive(d.learningDays),
      firstDate: null,
    }),
  },
  {
    id: "consistency",
    icon: "🔥",
    title: "Consistency Champion",
    habitName: "自律达人",
    unit: "天",
    description: "完成属于你的每一天，\n把自律活成自然而然。",
    quote: "大的改变，\n总是从每天的小事开始。",
    trackStreak: true,
    compute: (d) => ({
      lifetime: new Set(d.dailyCompleteDates).size,
      streak: longestStreak(d.dailyCompleteDates),
      firstDate: earliest(d.dailyCompleteDates),
    }),
  },
];

/**
 * Secret Achievements — always shown as mysteries so Glowing You never feels
 * "finished". Some give a small direction (hint); some reveal nothing yet.
 * Real unlock logic is intentionally NOT built in this phase — these stay as
 * discovery placeholders. When one is earned later, set status: "unlocked" and
 * fill icon/title/description; the UI already renders that.
 */
export const SECRET_ACHIEVEMENTS: SecretAchievement[] = [
  { id: "s1", status: "hint", hint: "连续照顾自己很多天。" },
  { id: "s2", status: "unknown" },
  { id: "s3", status: "hint", hint: "完成一个特别的挑战。" },
  { id: "s4", status: "unknown" },
  { id: "s5", status: "hint", hint: "在清晨，坚持一件小事。" },
  { id: "s6", status: "unknown" },
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
