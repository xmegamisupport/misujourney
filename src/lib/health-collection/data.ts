"use client";

import { createClient } from "@/lib/supabase/client";
import type { ProductCode } from "@/lib/inventory/types";
import type { RawBadgeData } from "./types";

const EMPTY: RawBadgeData = {
  dailyCompleteDates: [],
  weighInDates: [],
  waterDates: [],
  learningDays: [],
  sachetUsed: { MISU_N_PLUS: 0, MISU_DX_PLUS: 0 },
};

/**
 * Read-only aggregation of everything the six badges need, straight from the
 * tables MISU already maintains. Nothing here writes; RLS already scopes every
 * table to the signed-in customer's own rows.
 *
 * We first ask the server to settle rewards, so the `daily_complete` ledger the
 * Consistency badge reads is current for today before we count it.
 */
export async function fetchBadgeData(customerId: string): Promise<RawBadgeData> {
  if (!customerId) return EMPTY;
  const supabase = createClient();

  // Best-effort: make sure today's rewards (incl. daily_complete) are settled.
  try {
    await supabase.rpc("refresh_journey_rewards");
  } catch {
    /* points are a reward layer; never block the collection on it */
  }

  const [ledgerRes, checkinRes, waterRes, goalRes, learnRes, invRes] = await Promise.all([
    supabase
      .from("journey_point_events")
      .select("earned_on")
      .eq("customer_id", customerId)
      .eq("action", "daily_complete"),
    supabase
      .from("daily_checkins")
      .select("checkin_date")
      .eq("customer_id", customerId)
      .not("weight", "is", null),
    supabase.from("daily_water_logs").select("log_date, total_ml").eq("customer_id", customerId),
    supabase
      .from("customer_goals")
      .select("water_target_ml")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("cms_customer_content_progress")
      .select("day_number")
      .eq("customer_id", customerId)
      .not("completed_at", "is", null),
    supabase
      .from("customer_inventory")
      .select("product_code, total_used_units")
      .eq("customer_id", customerId),
  ]);

  const dailyCompleteDates = uniq((ledgerRes.data ?? []).map((r) => r.earned_on));
  const weighInDates = uniq((checkinRes.data ?? []).map((r) => r.checkin_date));

  const target = goalRes.data?.water_target_ml ?? null;
  const waterDates = uniq(
    (waterRes.data ?? [])
      .filter((r) => target != null && (r.total_ml ?? 0) >= target)
      .map((r) => r.log_date),
  );

  const learningDays = uniq((learnRes.data ?? []).map((r) => r.day_number).filter((d): d is number => d != null));

  const sachetUsed: Record<ProductCode, number> = { MISU_N_PLUS: 0, MISU_DX_PLUS: 0 };
  for (const row of invRes.data ?? []) {
    const code = row.product_code as ProductCode;
    if (code in sachetUsed) sachetUsed[code] = row.total_used_units ?? 0;
  }

  return { dailyCompleteDates, weighInDates, waterDates, learningDays, sachetUsed };
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
