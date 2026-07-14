"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getContentLibrary,
  getContentById,
  getPendingContent,
  getPublishedContent,
  getJourneySettings,
  getSchedule,
  getMyTodayContent,
} from "./engine";
import type { CmsContentItem, CmsJourneySettings, CmsScheduleEntry, TodayContentItem } from "./types";

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

export function useContentLibrary() {
  return useRefreshable<CmsContentItem[]>(getContentLibrary, []);
}

export function useContentItem(id: string) {
  return useRefreshable<CmsContentItem | undefined>(() => getContentById(id), undefined, [id]);
}

export function usePendingContent() {
  return useRefreshable<CmsContentItem[]>(getPendingContent, []);
}

export function usePublishedContent() {
  return useRefreshable<CmsContentItem[]>(getPublishedContent, []);
}

export function useJourneySettings() {
  return useRefreshable<CmsJourneySettings | undefined>(async () => getJourneySettings(), undefined);
}

export function useSchedule() {
  return useRefreshable<CmsScheduleEntry[]>(getSchedule, []);
}

export function useMyTodayContent() {
  return useRefreshable<TodayContentItem[]>(getMyTodayContent, []);
}
