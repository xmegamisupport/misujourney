"use client";

import { useEffect, useState } from "react";
import { getJourneyDayForDate } from "./engine";
import type { JourneyDay } from "./types";

export function useTodayJourneyDay(customerId: string, date: string): { data: JourneyDay | null; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<JourneyDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getJourneyDayForDate(customerId, date)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, date, nonce]);

  return { data, loading, refresh: () => setNonce((n) => n + 1) };
}
