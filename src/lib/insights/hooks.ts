"use client";

import { useEffect, useState } from "react";
import { getActiveAttentionFlags, getActiveAttentionFlagsForCustomers, getLatestCustomerInsight, getLatestInsightsForCustomers } from "./engine";
import type { AIInsight, AnalysisType, AttentionFlag } from "./types";

export function useLatestCustomerInsight(customerId: string, analysisType: AnalysisType): { data: AIInsight | undefined; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<AIInsight | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getLatestCustomerInsight(customerId, analysisType)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, analysisType, nonce]);

  return { data, loading, refresh: () => setNonce((n) => n + 1) };
}

export function useActiveAttentionFlags(customerId: string): { data: AttentionFlag[]; loading: boolean } {
  const [data, setData] = useState<AttentionFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getActiveAttentionFlags(customerId)
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

export function useAttentionFlagsForCustomers(customerIds: string[]): { data: Record<string, AttentionFlag[]>; loading: boolean } {
  const [data, setData] = useState<Record<string, AttentionFlag[]>>({});
  const [loading, setLoading] = useState(true);
  const key = customerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    getActiveAttentionFlagsForCustomers(customerIds)
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

export function useLatestInsightsForCustomers(customerIds: string[], analysisType: AnalysisType): { data: Record<string, AIInsight>; loading: boolean } {
  const [data, setData] = useState<Record<string, AIInsight>>({});
  const [loading, setLoading] = useState(true);
  const key = customerIds.join(",");

  useEffect(() => {
    let cancelled = false;
    getLatestInsightsForCustomers(customerIds, analysisType)
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
  }, [key, analysisType]);

  return { data, loading };
}
