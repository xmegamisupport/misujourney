"use client";

import { useEffect, useState } from "react";
import {
  findInProgressBodyProgressRecordId,
  getBodyProgressDueState,
  getBodyProgressHistory,
  getBodyProgressRecord,
  getFirstBodyProgressRecord,
  getLatestBodyProgressRecord,
  resolveBodyProgressCta,
} from "./engine";
import type { BodyProgressDueState, BodyProgressHomeState, BodyProgressRecord } from "./types";

export function useBodyProgressHistory(customerId: string): { data: BodyProgressRecord[]; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<BodyProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getBodyProgressHistory(customerId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, nonce]);

  return { data, loading, refresh: () => setNonce((n) => n + 1) };
}

export function useBodyProgressRecord(customerId: string, recordId: string): { data: BodyProgressRecord | undefined; loading: boolean } {
  const [data, setData] = useState<BodyProgressRecord | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBodyProgressRecord(customerId, recordId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, recordId]);

  return { data, loading };
}

export function useFirstBodyProgressRecord(customerId: string): { data: BodyProgressRecord | undefined; loading: boolean } {
  const [data, setData] = useState<BodyProgressRecord | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getFirstBodyProgressRecord(customerId)
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

export function useLatestBodyProgressRecord(customerId: string): { data: BodyProgressRecord | undefined; loading: boolean } {
  const [data, setData] = useState<BodyProgressRecord | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getLatestBodyProgressRecord(customerId)
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

/** One combined fetch for the Home page (and the Dashboard card) so both
 * always derive their CTA from resolveBodyProgressCta() with the exact same
 * inputs — "the system decides", never two places computing it separately. */
export function useBodyProgressHomeState(customerId: string): BodyProgressHomeState & { refresh: () => void } {
  const [history, setHistory] = useState<BodyProgressRecord[]>([]);
  const [dueState, setDueState] = useState<BodyProgressDueState>({ firstRecordCompleted: false, nextDueDate: null, daysRemaining: null, isOverdue: false });
  const [inProgressRecordId, setInProgressRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    Promise.all([getBodyProgressHistory(customerId), getBodyProgressDueState(customerId), findInProgressBodyProgressRecordId(customerId)])
      .then(([historyResult, dueStateResult, inProgressResult]) => {
        if (cancelled) return;
        setHistory(historyResult);
        setDueState(dueStateResult);
        setInProgressRecordId(inProgressResult);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, nonce]);

  return { loading, history, dueState, inProgressRecordId, cta: resolveBodyProgressCta(dueState, inProgressRecordId), refresh: () => setNonce((n) => n + 1) };
}

export function useBodyProgressDueState(customerId: string): { data: BodyProgressDueState | undefined; loading: boolean } {
  const [data, setData] = useState<BodyProgressDueState | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBodyProgressDueState(customerId)
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
