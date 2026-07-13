"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayDateStr } from "@/lib/inventory/engine";

const WATER_KEY = "misu-water-intake";
const CHANGE_EVENT = "misu-daily-progress-change";

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Keyed by customerId so switching accounts on the same browser (or a
 * fresh registration right after testing another account) never carries
 * over a previous account's water total. */
function waterKey(customerId: string): string {
  return `${WATER_KEY}:${customerId}`;
}

/** Fire-and-forget so this never blocks or changes the UI's existing
 * synchronous behavior — water intake was previously localStorage-only,
 * never queryable server-side. Persisting it (in addition to, not instead
 * of, the localStorage value the UI already reads) is what makes "饮水完成
 * 情况" a real AI-analysis input instead of a fabricated one. */
async function persistWaterLog(customerId: string, totalMl: number) {
  if (!customerId) return;
  const supabase = createClient();
  const { error } = await supabase.from("daily_water_logs").upsert({ customer_id: customerId, log_date: todayDateStr(), total_ml: totalMl }, { onConflict: "customer_id,log_date" });
  if (error) console.error("Failed to persist water log", error);
}

/** No upper cap at `target` — customers can keep logging water past their
 * daily goal instead of the button silently doing nothing once "done". */
export function addWater(customerId: string, amountMl: number, baseline: number) {
  const key = waterKey(customerId);
  const raw = localStorage.getItem(key);
  const current = raw !== null ? Number(raw) : baseline;
  const next = Math.max(0, current + amountMl);
  localStorage.setItem(key, String(next));
  emitChange();
  void persistWaterLog(customerId, next);
}

export function useWaterIntake(customerId: string, baseline: number): number {
  const key = waterKey(customerId);
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key),
    () => null,
  );
  const value = raw !== null ? Number(raw) : baseline;
  return Math.max(0, value);
}

/** A Coach reads a customer's water intake from another browser, so the
 * localStorage-first value above doesn't apply — this reads the persisted
 * daily_water_logs mirror instead (batched, for the customer roster). */
export async function getWaterLogsForCustomers(customerIds: string[], date: string): Promise<Record<string, number>> {
  if (customerIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_water_logs")
    .select("customer_id, total_ml")
    .in("customer_id", customerIds)
    .eq("log_date", date);
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.customer_id] = row.total_ml;
  }
  return map;
}

export function useWaterLogsForCustomers(customerIds: string[], date: string): { data: Record<string, number>; loading: boolean } {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const key = customerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    getWaterLogsForCustomers(customerIds, date)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, date]);

  return { data, loading };
}
