"use client";

import { createClient } from "@/lib/supabase/client";

/** One row on any ranking board — the ONLY fields the server exposes about
 *  another person: display name, avatar emoji, and the board's value. Never id,
 *  email, phone, or weight. Names + points are public by product decision. */
export interface RankRow {
  rank: number;
  name: string;
  avatar: string;
  value: number;
  isMe: boolean;
}

export interface RankingBoard {
  /** The caller's own standing on this board, if they're eligible + ranked. */
  me: { rank: number; value: number } | null;
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

export interface WeeklyChallenge {
  challenge: { icon: string; title: string; description: string; goalType: string; goalParams: Record<string, unknown> } | null;
  participants: number;
  completions: number;
  meCompleted: boolean;
  completers: { name: string; avatar: string; isMe: boolean }[];
}

const EMPTY_CHALLENGE: WeeklyChallenge = {
  challenge: null,
  participants: 0,
  completions: 0,
  meCompleted: false,
  completers: [],
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
