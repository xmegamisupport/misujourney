"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentCustomerGoal, getCurrentGoalPlan } from "@/lib/goals/engine";
import { getCheckInsForCustomer, todayDateStr } from "@/lib/inventory/engine";
import type { DailyCheckIn } from "@/lib/inventory/types";

/**
 * Real per-customer identity + Day-N/streak/weight state, replacing the
 * Phase-1 demo persona (mock-data.ts's currentCustomer) that every /customer
 * page originally rendered regardless of who actually signed up. Nothing
 * here is fabricated: a field is null/0 rather than filled with a stand-in
 * number when the customer hasn't produced that data yet (e.g. Day 1, no
 * check-ins => streakDays 0, latestWeight null).
 */
export interface JourneySummary {
  name: string;
  avatar: string;
  age: number | null;
  height: number | null;
  currentDay: number;
  planLength: number;
  streakDays: number;
  startWeight: number | null;
  latestWeight: number | null;
}

const DEFAULT_AVATAR = "🙂";
const DEFAULT_PLAN_LENGTH = 30;

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

export function calculateCurrentDay(startDate: string | null): number {
  if (!startDate) return 1;
  const diffDays = Math.round((toUtcDate(todayDateStr()).getTime() - toUtcDate(startDate).getTime()) / 86400000);
  return Math.max(1, diffDays + 1);
}

/** checkIns must be sorted descending by date (getCheckInsForCustomer's
 * default order). Counts consecutive calendar days ending at the most
 * recent check-in; a gap of more than one day from today means the streak
 * has already lapsed. */
export function calculateStreakDays(checkIns: DailyCheckIn[]): number {
  if (checkIns.length === 0) return 0;
  const dates = [...new Set(checkIns.map((c) => c.date))];
  const mostRecent = dates[0];
  const gapFromToday = Math.round((toUtcDate(todayDateStr()).getTime() - toUtcDate(mostRecent).getTime()) / 86400000);
  if (gapFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const gap = Math.round((toUtcDate(dates[i - 1]).getTime() - toUtcDate(dates[i]).getTime()) / 86400000);
    if (gap !== 1) break;
    streak++;
  }
  return streak;
}

export function useJourneySummary(customerId: string): { data: JourneySummary | null; loading: boolean } {
  const [data, setData] = useState<JourneySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    Promise.all([
      supabase.from("profiles").select("name, avatar, age, height, start_date, start_weight").eq("id", customerId).single(),
      getCurrentGoalPlan(customerId),
      getCurrentCustomerGoal(customerId),
      getCheckInsForCustomer(customerId),
    ])
      .then(([profileRes, goalPlan, customerGoal, checkIns]) => {
        if (cancelled) return;
        const profile = profileRes.data;
        const planLength = goalPlan?.journeyDays ?? DEFAULT_PLAN_LENGTH;
        const currentDay = Math.min(calculateCurrentDay(profile?.start_date ?? null), planLength);
        setData({
          name: profile?.name ?? "",
          avatar: profile?.avatar ?? DEFAULT_AVATAR,
          age: profile?.age ?? null,
          height: profile?.height === null || profile?.height === undefined ? null : Number(profile.height),
          currentDay,
          planLength,
          streakDays: calculateStreakDays(checkIns),
          startWeight: customerGoal?.baseWeightKg ?? (profile?.start_weight === null || profile?.start_weight === undefined ? null : Number(profile.start_weight)),
          latestWeight: checkIns[0]?.weight ?? null,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return { data, loading };
}
