"use client";

import { useCallback, useEffect, useState } from "react";
import { getJourneyBaselineStatus, EMPTY_BASELINE_STATUS, type JourneyBaselineStatus } from "./engine";

export function useJourneyBaselineStatus(customerId: string): { status: JourneyBaselineStatus; refresh: () => void } {
  const [status, setStatus] = useState<JourneyBaselineStatus>(EMPTY_BASELINE_STATUS);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    getJourneyBaselineStatus(customerId).then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, tick]);

  return { status, refresh };
}
