"use client";

import { createClient } from "@/lib/supabase/client";

/** One row on a board — the ONLY fields the server exposes about another person:
 *  their display name, avatar emoji, and points. No id, email, phone, or weight. */
export interface LeaderboardRow {
  rank: number;
  name: string;
  avatar: string;
  points: number;
  isMe: boolean;
}

/** The caller's own standing (present once they've earned any points). */
export interface MyStanding {
  name: string;
  avatar: string | null;
  total: number;
  weekly: number;
  totalRank: number;
  weeklyRank: number;
}

export interface Leaderboard {
  me: MyStanding | null;
  topTotal: LeaderboardRow[];
  topWeekly: LeaderboardRow[];
}

const EMPTY: Leaderboard = { me: null, topTotal: [], topWeekly: [] };

/** The community leaderboard — all-time and this-week rankings by Journey
 *  Points. Server-side scoped to customers; only name + avatar + points leave
 *  the database (the community made public by product decision). */
export async function getJourneyLeaderboard(): Promise<Leaderboard> {
  const supabase = createClient();
  // `get_journey_leaderboard` isn't in the generated Database types yet (regen
  // pending); it returns jsonb, which we validate/shape into Leaderboard below.
  const { data, error } = await supabase.rpc("get_journey_leaderboard" as never, { p_limit: 50 } as never);
  if (error || !data || typeof data !== "object") return EMPTY;
  return data as unknown as Leaderboard;
}
