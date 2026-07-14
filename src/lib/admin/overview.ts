"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateCurrentDay } from "@/lib/journey";
import { getGoalPlansForCustomers } from "@/lib/goals/engine";
import { getCheckInsForCustomers, getTodayMealsForCustomers, getActiveAlerts, todayDateStr } from "@/lib/inventory/engine";
import { getCheckoutsForCustomers } from "@/lib/checkout/engine";

export interface AdminOverviewStats {
  totalCustomers: number;
  totalCoaches: number;
  activeToday: number;
  avgCheckinRate: number;
  plan60CompletionRate: number;
  plan90CompletionRate: number;
  pendingIssues: number;
}

const EMPTY_STATS: AdminOverviewStats = {
  totalCustomers: 0,
  totalCoaches: 0,
  activeToday: 0,
  avgCheckinRate: 0,
  plan60CompletionRate: 0,
  plan90CompletionRate: 0,
  pendingIssues: 0,
};

function completionRate(rows: { currentDay: number; planLength: number }[], planLength: number): number {
  const cohort = rows.filter((r) => r.planLength === planLength);
  if (cohort.length === 0) return 0;
  const completed = cohort.filter((r) => r.currentDay >= r.planLength).length;
  return Math.round((completed / cohort.length) * 100);
}

/** Platform-wide stats for the Admin overview page — getActiveAlerts() goes
 * through the normal RLS-scoped client, which (as an admin) resolves to
 * every open alert via alerts_select_as_admin, not just one coach's. */
export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const supabase = createClient();
  const today = todayDateStr();

  const [{ data: customers, error: custError }, { count: totalCoaches, error: coachError }, activeAlerts] = await Promise.all([
    supabase.from("profiles").select("id, start_date").eq("role", "customer"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "coach"),
    getActiveAlerts(),
  ]);
  if (custError) throw custError;
  if (coachError) throw coachError;
  if (!customers || customers.length === 0) return { ...EMPTY_STATS, totalCoaches: totalCoaches ?? 0, pendingIssues: activeAlerts.length };

  const customerIds = customers.map((c) => c.id);
  const [goalPlanMap, checkInMap, todayMealsMap, checkoutMap] = await Promise.all([
    getGoalPlansForCustomers(customerIds),
    getCheckInsForCustomers(customerIds),
    getTodayMealsForCustomers(customerIds),
    getCheckoutsForCustomers(customerIds, today, today),
  ]);

  const progress = customers.map((c) => {
    const planLength = goalPlanMap[c.id]?.journeyDays ?? 30;
    const currentDay = Math.min(calculateCurrentDay(c.start_date), planLength);
    const checkIns = checkInMap[c.id] ?? [];
    const checkinRate = currentDay > 0 ? Math.min(100, Math.round((checkIns.length / currentDay) * 100)) : 0;
    const activeToday = checkIns.some((ci) => ci.date === today) || (todayMealsMap[c.id]?.length ?? 0) > 0 || (checkoutMap[c.id]?.length ?? 0) > 0;
    return { currentDay, planLength, checkinRate, activeToday };
  });

  return {
    totalCustomers: customers.length,
    totalCoaches: totalCoaches ?? 0,
    activeToday: progress.filter((p) => p.activeToday).length,
    avgCheckinRate: Math.round(progress.reduce((sum, p) => sum + p.checkinRate, 0) / progress.length),
    plan60CompletionRate: completionRate(progress, 60),
    plan90CompletionRate: completionRate(progress, 90),
    pendingIssues: activeAlerts.length,
  };
}

export function useAdminOverviewStats(): { data: AdminOverviewStats; loading: boolean } {
  const [data, setData] = useState<AdminOverviewStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAdminOverviewStats()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
