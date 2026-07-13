"use client";

import { useEffect, useState } from "react";
import { getPortionOptions } from "./engine";
import type { FoodCategory, FoodPortionOption } from "./types";

export function usePortionOptions(category: FoodCategory): { data: FoodPortionOption[]; loading: boolean } {
  const [data, setData] = useState<FoodPortionOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPortionOptions(category)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  return { data, loading };
}
