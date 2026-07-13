"use client";

import { useEffect, useState } from "react";
import { getCurrentCustomerGoal, getCurrentGoalPlan, getCurrentGoalsForCustomers } from "./engine";
import type { CustomerGoal, GoalPlan } from "./types";

export function useCurrentCustomerGoal(customerId: string): { data: CustomerGoal | undefined; loading: boolean } {
  const [data, setData] = useState<CustomerGoal | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentCustomerGoal(customerId)
      .then((result) => {
        if (!cancelled) setData(result);
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

export function useCurrentGoalPlan(customerId: string): { data: GoalPlan | undefined; loading: boolean } {
  const [data, setData] = useState<GoalPlan | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentGoalPlan(customerId)
      .then((result) => {
        if (!cancelled) setData(result);
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

export function useGoalsForCustomers(customerIds: string[]): { data: Record<string, CustomerGoal>; loading: boolean } {
  const [data, setData] = useState<Record<string, CustomerGoal>>({});
  const [loading, setLoading] = useState(true);
  const key = customerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    getCurrentGoalsForCustomers(customerIds)
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
  }, [key]);

  return { data, loading };
}
