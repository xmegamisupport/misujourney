"use client";

import { useEffect, useState } from "react";
import { getCheckoutForDate } from "./engine";
import type { EveningCheckout } from "./types";

export function useCheckoutForDate(customerId: string, date: string): { data: EveningCheckout | undefined; loading: boolean } {
  const [data, setData] = useState<EveningCheckout | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCheckoutForDate(customerId, date)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, date]);

  return { data, loading };
}
