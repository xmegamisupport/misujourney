"use client";

import { useEffect, useState } from "react";
import { getCoachWorkspace, getCoachCustomerContext, type CoachCustomerContext } from "./workspace";
import type { CoachWorkspace } from "./workspace-types";

const EMPTY_WORKSPACE: CoachWorkspace = {
  celebrations: [],
  support: [],
  cards: [],
  impact: { totalCustomers: 0, activeJourney: 0, journeysCompleted: 0, journeysPaused: 0, journeysCompletedThisMonth: 0 },
  celebrateCustomerCount: 0,
  supportCustomerCount: 0,
};

export function useCoachWorkspace(coachId: string): { data: CoachWorkspace; loading: boolean } {
  const [data, setData] = useState<CoachWorkspace>(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;
    getCoachWorkspace(coachId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  return { data, loading };
}

export function useCoachCustomerContext(customerId: string): { data: CoachCustomerContext | undefined; loading: boolean } {
  const [data, setData] = useState<CoachCustomerContext | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    getCoachCustomerContext(customerId)
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
