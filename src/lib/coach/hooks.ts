"use client";

import { useCallback, useEffect, useState } from "react";
import { getCustomerProfile, getMyCustomers, getAllCoaches, getMyCoachProfile } from "./engine";
import type { CoachCustomerProfile, CoachCustomerSummary, AdminCoachSummary, MyCoachProfile } from "./engine";

export function useMyCustomers(coachId: string): { data: CoachCustomerSummary[]; loading: boolean } {
  const [data, setData] = useState<CoachCustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyCustomers(coachId)
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

export function useAllCoaches(): { data: AdminCoachSummary[]; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<AdminCoachSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    getAllCoaches()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { data, loading, refresh };
}

export function useMyCoachProfile(coachId: string): { data: MyCoachProfile | undefined; loading: boolean } {
  const [data, setData] = useState<MyCoachProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyCoachProfile(coachId)
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

export function useCustomerProfile(customerId: string): { data: CoachCustomerProfile | undefined; loading: boolean } {
  const [data, setData] = useState<CoachCustomerProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCustomerProfile(customerId)
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
