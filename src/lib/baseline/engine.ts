"use client";

import { createClient } from "@/lib/supabase/client";
import { getFirstBodyProgressRecord } from "@/lib/bodyProgress/engine";

export interface JourneyBaselineStatus {
  /** Starting photos captured (a Body Progress record exists). */
  photosDone: boolean;
  /** Starting data recorded (weight + usual sleep time). */
  dataDone: boolean;
  /** Both baseline items done — the Dashboard reminder retires for good. */
  complete: boolean;
  loaded: boolean;
}

export const EMPTY_BASELINE_STATUS: JourneyBaselineStatus = {
  photosDone: false,
  dataDone: false,
  complete: false,
  loaded: false,
};

/** Photos completion reuses the existing Body Progress capture (first record =
 * done); data completion reads the customer's own profile flag. */
export async function getJourneyBaselineStatus(customerId: string): Promise<JourneyBaselineStatus> {
  const supabase = createClient();
  const [firstRecord, profileRes] = await Promise.all([
    getFirstBodyProgressRecord(customerId),
    supabase.from("profiles").select("baseline_data_completed_at").eq("id", customerId).maybeSingle(),
  ]);
  const photosDone = firstRecord !== undefined;
  const dataDone = profileRes.data?.baseline_data_completed_at != null;
  return { photosDone, dataDone, complete: photosDone && dataDone, loaded: true };
}

export interface RecordBaselineInput {
  /** Usual routine, not just last night — overnight ranges (e.g. 23:30 →
   * 07:00) are valid; the two times are stored independently. */
  bedtime: string;
  wakeTime: string;
  /** Lifestyle habit codes (see baseline/constants). */
  bowelHabit: string;
  hydrationHabit: string;
}

export interface RecordBaselineResult {
  ok: boolean;
  error?: string;
}

/** Weight is deliberately NOT sent — it was captured at registration and is
 * the fixed basis for the water target; this only records lifestyle habits. */
export async function recordJourneyBaseline(input: RecordBaselineInput): Promise<RecordBaselineResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("record_journey_baseline", {
    p_bedtime: input.bedtime,
    p_wake_time: input.wakeTime,
    p_bowel_habit: input.bowelHabit,
    p_hydration_habit: input.hydrationHabit,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
