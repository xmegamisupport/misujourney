"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyNotifications, getUnreadNotificationCount, type AppNotification } from "./engine";

export function useNotifications(): { data: AppNotification[]; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    getMyNotifications()
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

export function useUnreadNotificationCount(): { count: number; loading: boolean; refresh: () => void } {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    getUnreadNotificationCount()
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
