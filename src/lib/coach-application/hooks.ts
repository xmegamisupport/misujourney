"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCoachApplicationForAdmin,
  getCoachApplicationsForAdmin,
  getMyCoachApplications,
  getPendingCoachApplicationCount,
} from "./engine";
import type { AdminCoachApplication, MyCoachApplication } from "./types";

export function useMyCoachApplications(): { data: MyCoachApplication[]; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<MyCoachApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    getMyCoachApplications()
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

export function usePendingCoachApplicationCount(): { count: number; loading: boolean; refresh: () => void } {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    getPendingCoachApplicationCount()
      .then((result) => {
        if (!cancelled) setCount(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { count, loading, refresh };
}

export function useCoachApplicationsForAdmin(): { data: AdminCoachApplication[]; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<AdminCoachApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    getCoachApplicationsForAdmin()
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

export function useCoachApplicationForAdmin(id: string): { data: AdminCoachApplication | null; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<AdminCoachApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    getCoachApplicationForAdmin(id)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, tick]);

  return { data, loading, refresh };
}
