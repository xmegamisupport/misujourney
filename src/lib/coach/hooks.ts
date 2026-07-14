"use client";

import { useCallback, useEffect, useState } from "react";
import { getCustomerProfile, getMyCustomers, getAllCoaches, getMyCoachProfile, getAllCustomersForAdmin, getCoachBoundCustomers } from "./engine";
import type { CoachCustomerProfile, CoachCustomerSummary, AdminCoachSummary, AdminCustomerSummary, MyCoachProfile, CoachBoundCustomer } from "./engine";

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

export function useAllCustomersForAdmin(): { data: AdminCustomerSummary[]; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<AdminCustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    getAllCustomersForAdmin()
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

export function useAllCoaches(): { data: AdminCoachSummary[]; loading: boolean; refresh: () => void; prepend: (coach: AdminCoachSummary) => void } {
  const [data, setData] = useState<AdminCoachSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  // Lets a just-created coach show up immediately instead of waiting on a
  // full re-fetch (session check + 2 queries + admin API lookup) — refresh()
  // still runs in the background to reconcile.
  const prepend = useCallback((coach: AdminCoachSummary) => setData((prev) => [coach, ...prev]), []);

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

  return { data, loading, refresh, prepend };
}

export function useMyCoachProfile(coachId: string): { data: MyCoachProfile | undefined; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<MyCoachProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

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
  }, [coachId, tick]);

  return { data, loading, refresh };
}

export function useCoachBoundCustomers(coachId: string): { data: CoachBoundCustomer[]; loading: boolean } {
  const [data, setData] = useState<CoachBoundCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCoachBoundCustomers(coachId)
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
