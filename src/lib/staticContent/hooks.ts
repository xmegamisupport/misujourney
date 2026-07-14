"use client";

import { useCallback, useEffect, useState } from "react";
import { getFaqs, getFaqById, getProductGuides, getProductGuideById } from "./engine";
import type { FaqItem, ProductGuideItem } from "./types";

function useRefreshable<T>(fetcher: () => Promise<T>, initial: T, deps: React.DependencyList = []): { data: T; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetcher()
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
  }, [...deps, tick]);

  return { data, loading, refresh };
}

export function useFaqs() {
  return useRefreshable<FaqItem[]>(getFaqs, []);
}

export function useFaqItem(id: string) {
  return useRefreshable<FaqItem | undefined>(() => getFaqById(id), undefined, [id]);
}

export function useProductGuides() {
  return useRefreshable<ProductGuideItem[]>(getProductGuides, []);
}

export function useProductGuideItem(id: string) {
  return useRefreshable<ProductGuideItem | undefined>(() => getProductGuideById(id), undefined, [id]);
}
