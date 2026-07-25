"use client";

/**
 * Hidden Discovery — customer reveal + collection (Phase 5).
 *
 * The only three calls the customer experience needs. Everything is scoped to
 * the signed-in user server-side; the client never learns a discovery exists
 * until it has been unlocked. Rarity is never returned here — by design.
 */
import { createClient } from "@/lib/supabase/client";

/** A discovery waiting to be revealed in a Reveal Session. */
export interface RevealItem {
  queueId: string;
  code: string;
  name: string;
  icon: string;
  message: string;
  category: string;
}

/** A permanently-collected discovery. */
export interface CollectionItem {
  code: string;
  name: string;
  icon: string;
  message: string;
  category: string;
  discoveredAt: string;
}

/** Discoveries unlocked but not yet revealed to this user. */
export async function getReadyReveals(): Promise<RevealItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_ready_reveals");
  if (error || !Array.isArray(data)) return [];
  return data as unknown as RevealItem[];
}

/** Finish a Reveal Session — everything shown becomes part of the Collection. */
export async function acknowledgeReveals(queueIds: string[]): Promise<void> {
  if (queueIds.length === 0) return;
  const supabase = createClient();
  await supabase.rpc("acknowledge_discovery_reveals", { p_queue_ids: queueIds });
}

/** The permanent Collection, newest first. */
export async function getDiscoveryCollection(): Promise<CollectionItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_discovery_collection");
  if (error || !Array.isArray(data)) return [];
  return data as unknown as CollectionItem[];
}

/** Soft ambient palette per category — gives each Discovery its own little
 *  world, without ever implying rank. Not rarity: purely a mood. */
export interface Ambient {
  from: string;
  to: string;
  glow: string;
  ring: string;
}

const AMBIENTS: Record<string, Ambient> = {
  early: { from: "#fff7ed", to: "#ffe4e6", glow: "#fdba74", ring: "#fb923c" },
  water: { from: "#ecfeff", to: "#e0f2fe", glow: "#7dd3fc", ring: "#38bdf8" },
  food: { from: "#f0fdf4", to: "#ecfccb", glow: "#86efac", ring: "#4ade80" },
  reflection: { from: "#eef2ff", to: "#ede9fe", glow: "#a5b4fc", ring: "#818cf8" },
  calendar: { from: "#faf5ff", to: "#fae8ff", glow: "#d8b4fe", ring: "#c084fc" },
  achievement: { from: "#fffbeb", to: "#ffedd5", glow: "#fcd34d", ring: "#f59e0b" },
  milestone: { from: "#f0fdfa", to: "#ccfbf1", glow: "#5eead4", ring: "#2dd4bf" },
  comeback: { from: "#fff1f2", to: "#ffe4e6", glow: "#fda4af", ring: "#fb7185" },
};

export function ambientFor(category: string): Ambient {
  return AMBIENTS[category] ?? { from: "#f8fafc", to: "#ecfdf5", glow: "#6ee7b7", ring: "#34d399" };
}
