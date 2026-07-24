"use client";

import { useCallback, useEffect, useState } from "react";
import { evaluateDiscoveries, getMyDiscoveries } from "./engine";
import type { DiscoveryState, RevealedDiscovery } from "./types";

const EMPTY: DiscoveryState = { clues: [], discovered: [] };

/**
 * Load the customer's Discovery state and run the engine once per visit. The
 * engine self-heals (assigns clues, unlocks from real data, rotates stale
 * clues) and reveals at most one discovery at a time — so a fresh reveal drips
 * in as a delight rather than a dump of everything at once.
 */
export function useDiscoveries(customerId: string) {
  const [state, setState] = useState<DiscoveryState>(EMPTY);
  const [revealed, setRevealed] = useState<RevealedDiscovery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    (async () => {
      const fresh = await evaluateDiscoveries();
      const next = await getMyDiscoveries();
      if (cancelled) return;
      setState(next);
      setRevealed(fresh);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const dismissReveal = useCallback(() => setRevealed(null), []);

  return { state, loading, revealed, dismissReveal };
}
