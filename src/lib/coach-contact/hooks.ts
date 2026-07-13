"use client";

import { useEffect, useState } from "react";
import { getMyCoachContact } from "./engine";
import type { CoachContact } from "./types";

export function useMyCoachContact(): { data: CoachContact | null; loading: boolean } {
  const [data, setData] = useState<CoachContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyCoachContact()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
