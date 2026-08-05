"use client";

import { createClient } from "@/lib/supabase/client";

export type TrendDir = "up" | "down" | "same" | "new";
export interface Trend {
  dir: TrendDir;
  delta: number;
}

/** One row on any ranking board — the ONLY fields the server exposes about
 *  another person: display name, avatar emoji, the board's value, and how the
 *  rank moved. Never id, email, phone, or weight. Names + points are public by
 *  product decision. */
export interface RankRow {
  rank: number;
  name: string;
  avatar: string;
  value: number;
  isMe: boolean;
  trend: Trend;
}

export interface MyStanding {
  rank: number;
  value: number;
  trend: Trend;
  /** Points still needed to reach the Top-10 cutoff (0 if already in Top 10). */
  toTop10: number;
}

export interface RankingBoard {
  /** The caller's own standing on this board, if they're eligible + ranked. */
  me: MyStanding | null;
  rows: RankRow[];
}

const EMPTY_BOARD: RankingBoard = { me: null, rows: [] };

/** Fetch one ranking board by type. The type dispatches server-side; all the
 *  rules (weekly window, eligibility windows) live in leaderboard_settings, so
 *  the client stays dumb and future boards need no new fetch code. */
export async function getLeaderboard(type: string): Promise<RankingBoard> {
  const supabase = createClient();
  // Not in generated Database types yet (regen pending); returns jsonb.
  const { data, error } = await supabase.rpc("get_leaderboard" as never, { p_type: type } as never);
  if (error || !data || typeof data !== "object") return EMPTY_BOARD;
  return data as unknown as RankingBoard;
}

export interface Traveler {
  name: string;
  avatar: string;
}

export interface WeeklyChallenge {
  challenge: { icon: string; title: string; description: string; goalType: string; goalParams: Record<string, unknown> } | null;
  /** How far into the challenge week we are, e.g. Day 3 / 7. */
  dayProgress: { day: number; total: number };
  meCompleted: boolean;
  /** Pool of OTHER travelers active this week — the client shows a rotating
   *  4–6 of them (padding with system travelers when the pool is small) to keep
   *  the "someone's keeping at it with me" feeling, not a head-count. */
  travelers: Traveler[];
}

const EMPTY_CHALLENGE: WeeklyChallenge = {
  challenge: null,
  dayProgress: { day: 0, total: 7 },
  meCompleted: false,
  travelers: [],
};

/** The current week's community challenge — participation-shaped, not a pure
 *  ranking. The challenge definition is real config (weekly_challenges); Phase 1
 *  completions are mocked but the shape is final. */
export async function getWeeklyChallenge(): Promise<WeeklyChallenge> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_current_weekly_challenge" as never);
  if (error || !data || typeof data !== "object") return EMPTY_CHALLENGE;
  return { ...EMPTY_CHALLENGE, ...(data as unknown as WeeklyChallenge) };
}
