"use client";

import { useSyncExternalStore } from "react";
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

export function addWater(customerId: string, amountMl: number, baseline: number, target: number) {
  const key = waterKey(customerId);
  const raw = localStorage.getItem(key);
  const current = raw !== null ? Number(raw) : baseline;
  const next = Math.max(0, Math.min(target, current + amountMl));
  localStorage.setItem(key, String(next));
  emitChange();
  void persistWaterLog(customerId, next);
}

export function useWaterIntake(customerId: string, baseline: number, target: number): number {
  const key = waterKey(customerId);
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key),
    () => null,
  );
  const value = raw !== null ? Number(raw) : baseline;
  return Math.max(0, Math.min(target, value));
}
