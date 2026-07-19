"use client";

import { useCallback, useEffect, useState } from "react";
import { EMPTY_BALANCE, getJourneyPoints, refreshJourneyRewards } from "./engine";
import type { JourneyPointAward, JourneyPointBalance } from "./types";

/** Settle up, then report the balance.
 *
 * Deliberately ONE integration point rather than a hook call inside each of the
 * six task flows. Every task returns the customer to the Dashboard, so settling
 * here catches all of them — and because the server recomputes from real table
 * state, a task completed in a flow that forgot to call anything still gets
 * paid on the next Dashboard visit. Six call sites would each be a place to
 * forget; one call site cannot drift.
 *
 * `newAwards` is what to celebrate right now. It is cleared once the customer
 * has seen it, so a re-render never replays the animation. */
export function useJourneyPoints(customerId: string) {
  const [balance, setBalance] = useState<JourneyPointBalance>(EMPTY_BALANCE);
  const [newAwards, setNewAwards] = useState<JourneyPointAward[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const clearAwards = useCallback(() => setNewAwards([]), []);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;

    (async () => {
      const awarded = await refreshJourneyRewards();
      const next = await getJourneyPoints();
      if (cancelled) return;
      setBalance(next);
      if (awarded.length > 0) setNewAwards(awarded);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [customerId, tick]);

  return { balance, newAwards, loaded, refresh, clearAwards };
}
