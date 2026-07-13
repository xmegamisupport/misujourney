"use client";

import { useEffect, useState } from "react";
import { getCurrentNutritionTargets } from "./engine";
import type { JourneyNutritionTargets } from "./types";

export function useCurrentNutritionTargets(customerId: string): { data: JourneyNutritionTargets | undefined; loading: boolean } {
  const [data, setData] = useState<JourneyNutritionTargets | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentNutritionTargets(customerId)
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
