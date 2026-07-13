"use client";

import { useEffect, useState } from "react";
import { getCustomerProfile, getMyCustomers } from "./engine";
import type { CoachCustomerProfile, CoachCustomerSummary } from "./engine";

export function useMyCustomers(coachId: string): { data: CoachCustomerSummary[]; loading: boolean } {
  const [data, setData] = useState<CoachCustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyCustomers(coachId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  return { data, loading };
}

export function useCustomerProfile(customerId: string): { data: CoachCustomerProfile | undefined; loading: boolean } {
  const [data, setData] = useState<CoachCustomerProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCustomerProfile(customerId)
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
