"use client";

import { createClient } from "@/lib/supabase/client";
import type { DiscoveryState, RevealedDiscovery } from "./types";

const EMPTY: DiscoveryState = { clues: [], discovered: [] };

/**
 * Ask the server to run the Discovery Engine: assign clues, unlock discoveries
 * from real data, evolve hints, rotate a stale clue, and reveal ONE discovery
 * if it's due. Returns the newly-revealed discovery to celebrate (or null).
 *
 * Like the points engine, the browser can only ask it to run — every decision
 * and write is server-side, so nothing can be minted from a console. Failure is
 * silent: discoveries are a delight layer, never an error to show.
 */
export async function evaluateDiscoveries(): Promise<RevealedDiscovery | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("evaluate_discoveries");
  if (error || !data || typeof data !== "object") return null;
  return data as unknown as RevealedDiscovery;
}

/** The current clues (with the right hint) + revealed discoveries. */
export async function getMyDiscoveries(): Promise<DiscoveryState> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_discoveries");
  if (error || !data || typeof data !== "object") return EMPTY;
  const d = data as unknown as DiscoveryState;
  return { clues: d.clues ?? [], discovered: d.discovered ?? [] };
}
