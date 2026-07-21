"use client";

import { createClient } from "@/lib/supabase/client";
import type { JourneyPointAward, JourneyPointBalance } from "./types";

export const EMPTY_BALANCE: JourneyPointBalance = { total: 0, today: 0 };

/** Ask the server to recompute every award this customer is currently owed.
 *
 * There is no "give me points for X" call anywhere in the client, by design.
 * The browser cannot name an action, a value, or an amount — it can only ask
 * the server to look at the real tables and settle up. Points therefore cannot
 * be minted by editing a request, and a customer who completes something while
 * offline is paid by the next refresh instead of losing it.
 *
 * Returns ONLY what was newly awarded by this call, which is exactly what the
 * toast should announce. Calling it twice in a row returns [] the second time.
 *
 * Failure is silent on purpose: points are a reward layer, and a customer who
 * has just finished her Journey for the day should never be shown a database
 * error about her score. The next refresh fixes it. */
export async function refreshJourneyRewards(): Promise<JourneyPointAward[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("refresh_journey_rewards");
  if (error || !Array.isArray(data)) return [];
  return data as unknown as JourneyPointAward[];
}

/** The current worth of each action, straight from journey_point_values.
 *
 * Read live rather than hardcoded so the guide can never contradict what the
 * engine actually awards: re-tuning a value is a single UPDATE, and this page
 * reflects it on the next open. Readable by any signed-in user (RLS), because a
 * customer is allowed to know what things are worth. */
export async function getPointValues(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("journey_point_values").select("action, points");
  if (error || !data) return {};
  return Object.fromEntries(data.map((r) => [r.action, r.points]));
}

export async function getJourneyPoints(): Promise<JourneyPointBalance> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_journey_points");
  if (error || !data || typeof data !== "object") return EMPTY_BALANCE;
  const row = data as { total?: number; today?: number };
  return { total: Number(row.total ?? 0), today: Number(row.today ?? 0) };
}
