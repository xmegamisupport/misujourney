"use client";

import { useEffect, useState } from "react";
import { getCurrentNutritionTargets, getNutritionTargetsForCustomers } from "./engine";
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

export function useNutritionTargetsForCustomers(customerIds: string[]): { data: Record<string, JourneyNutritionTargets>; loading: boolean } {
  const [data, setData] = useState<Record<string, JourneyNutritionTargets>>({});
  const [loading, setLoading] = useState(true);
  const key = customerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    getNutritionTargetsForCustomers(customerIds)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading };
}
