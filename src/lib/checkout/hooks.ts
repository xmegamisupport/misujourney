"use client";

import { useEffect, useState } from "react";
import { getCheckoutForDate, getCheckoutsForCustomers } from "./engine";
import type { EveningCheckout } from "./types";

export function useCheckoutsForCustomers(customerIds: string[], startDate: string, endDate: string): { data: Record<string, EveningCheckout[]>; loading: boolean } {
  const [data, setData] = useState<Record<string, EveningCheckout[]>>({});
  const [loading, setLoading] = useState(true);
  const key = customerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    getCheckoutsForCustomers(customerIds, startDate, endDate)
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
  }, [key, startDate, endDate]);

  return { data, loading };
}

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
