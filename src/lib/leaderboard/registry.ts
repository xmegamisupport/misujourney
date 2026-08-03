/**
 * 🏆 Leaderboard registry — the single source of truth for WHAT boards exist.
 *
 * The Leaderboard page renders itself by iterating this list; it knows nothing
 * about specific boards. Adding a future board (monthly, hidden-discovery,
 * habit, coach-team, special-event…) is a two-line change:
 *   1. append an entry here, and
 *   2. add its `case` to the get_leaderboard() RPC (ranking boards only).
 * No page rewrite, ever. Order here is display order.
 *
 * `id` for a ranking board MUST match the RPC's p_type. `accent` only varies
 * the visual treatment so each board reads as its own "community event".
 */
export type LeaderboardKind = "ranking" | "challenge";
export type LeaderboardAccent = "gold" | "growth" | "star" | "challenge";

export interface LeaderboardSectionDef {
  id: string;
  kind: LeaderboardKind;
  icon: string;
  title: string;
  /** Short label for the tab pill (ranking boards). Falls back to `title`. */
  short?: string;
  description: string;
  /** Suffix shown after a row's value, e.g. "pts". Growth prefixes a "+". */
  unit?: string;
  /** Growth values are a delta and read better with a leading "+". */
  signed?: boolean;
  accent: LeaderboardAccent;
}

export const LEADERBOARD_SECTIONS: LeaderboardSectionDef[] = [
  {
    id: "weekly_journey",
    kind: "ranking",
    icon: "🏆",
    title: "本周积分榜",
    short: "积分榜",
    description: "这一周，谁贡献了最多 Journey Points。每周一，大家一起重新开始。",
    unit: "pts",
    accent: "gold",
  },
  {
    id: "weekly_growth",
    kind: "ranking",
    icon: "📈",
    title: "本周成长榜",
    short: "成长榜",
    description: "比上周进步最多的人 —— 这是「突破」，不是「高分」。稳稳进步，也能登顶。",
    unit: "pts",
    signed: true,
    accent: "growth",
  },
  {
    id: "rising_star",
    kind: "ranking",
    icon: "⭐",
    title: "新星榜",
    short: "新星榜",
    description: "刚加入不久的新旅人，在这里一起起步 —— 新人也有属于自己的舞台。",
    unit: "pts",
    accent: "star",
  },
  {
    id: "weekly_challenge",
    kind: "challenge",
    icon: "🎯",
    title: "本周挑战",
    description: "和大家一起，完成这一周的共同目标。",
    accent: "challenge",
  },
];
