"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayDateStr } from "@/lib/inventory/engine";

async function fetchTodayWater(customerId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_water_logs")
    .select("total_ml")
    .eq("customer_id", customerId)
    .eq("log_date", todayDateStr())
    .maybeSingle();
  if (error) throw error;
  return data?.total_ml ?? 0;
}

async function persistWaterLog(customerId: string, totalMl: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("daily_water_logs").upsert({ customer_id: customerId, log_date: todayDateStr(), total_ml: totalMl }, { onConflict: "customer_id,log_date" });
  if (error) throw error;
}

/** daily_water_logs (today's row) is the one source of truth across every
 * device — this used to be tracked in localStorage instead, which is why
 * the same customer could see a completely different total on their phone
 * vs desktop vs iPad: each browser kept its own independent counter, and
 * none of them ever reset at the day boundary (the key wasn't even scoped
 * by date), so a stale value could just keep growing across days on
 * whichever device was left open. Local state here is only an optimistic
 * cache over that one server-side number, not a second copy of it. */
export function useWaterIntake(customerId: string): { water: number; loading: boolean; addWater: (amountMl: number) => Promise<void> } {
  const [water, setWater] = useState(0);
  const [loading, setLoading] = useState(true);
  const waterRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const promise = customerId ? fetchTodayWater(customerId) : Promise.resolve(0);
    promise
      .then((total) => {
        if (cancelled) return;
        waterRef.current = total;
        setWater(total);
      })
      .catch((error) => {
        console.error("Failed to load water intake", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // Reads/writes waterRef (not the `water` state) so back-to-back clicks in
  // the same tick each add on top of the previous click's total instead of
  // all computing from the same stale render's `water` value.
  const addWater = useCallback(
    async (amountMl: number) => {
      if (!customerId) return;
      const next = Math.max(0, waterRef.current + amountMl);
      const previous = waterRef.current;
      waterRef.current = next;
      setWater(next);
      try {
        await persistWaterLog(customerId, next);
      } catch (error) {
        console.error("Failed to persist water log", error);
        waterRef.current = previous;
        setWater(previous);
      }
    },
    [customerId],
  );

  return { water, loading, addWater };
}

/** A Coach reads a customer's water intake from another browser — same
 * daily_water_logs table the customer's own useWaterIntake() reads from. */
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
