/**
 * The engine's only database surface. Two RPCs:
 *   • get_hidden_discovery_snapshot — read the caller's own aggregates.
 *   • record_hidden_discovery_unlocks — idempotent unlock + celebration queue.
 * Both are SECURITY DEFINER and keyed to auth.uid(); this module is the sole
 * place the engine touches Supabase, so evaluation stays pure and testable.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { NewUnlock, SignalData } from "./types.mts";

export type EngineClient = SupabaseClient<Database>;

/** Wire shape of get_hidden_discovery_snapshot(). */
export interface SnapshotRaw {
  timezone: string;
  signals: Partial<Record<string, SignalData>>;
  weight: { baselineKg: number | null; currentKg: number | null };
  goal: { stage: number | null; targetMaxKg: number | null };
  journey: { days: number | null; currentDay: number | null; completed: boolean };
}

/** One unlock to persist (matches the RPC's jsonb_to_recordset columns). */
export interface UnlockRequest {
  code: string;
  source_event: string;
  journey_id: string | null;
  stage: number | null;
  evidence: Record<string, unknown>;
  registry_version: string;
}

export async function fetchSnapshot(supabase: EngineClient): Promise<SnapshotRaw | null> {
  const { data, error } = await supabase.rpc("get_hidden_discovery_snapshot");
  if (error || data == null) return null;
  return data as unknown as SnapshotRaw;
}

export async function recordUnlocks(supabase: EngineClient, unlocks: UnlockRequest[]): Promise<NewUnlock[]> {
  if (unlocks.length === 0) return [];
  const { data, error } = await supabase.rpc("record_hidden_discovery_unlocks", {
    p_unlocks: unlocks as unknown as Json,
  });
  if (error || data == null) return [];
  return data as unknown as NewUnlock[];
}
