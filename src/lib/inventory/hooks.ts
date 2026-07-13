"use client";

import { useCallback, useEffect, useState } from "react";
import {
  subscribeInventory,
  getCustomerInventoryList,
  getTransactionsForCustomer,
  getCheckInsForCustomer,
  getTodayCheckIn,
  getAlertsForCustomer,
  getActiveAlerts,
  getTodayMeals,
  getInventoryForCustomers,
  getCheckInsForCustomers,
  getTransactionsForCustomers,
  getTodayMealsForCustomers,
} from "./engine";
import type { CustomerInventory, DailyCheckIn, InventoryTransaction, RepurchaseAlert } from "./types";
import type { MealEntry } from "@/lib/types";

export interface AsyncResource<T> {
  data: T;
  loading: boolean;
  refetch: () => void;
}

/** Fetches `fetcher()` on mount / dependency change, and again whenever any
 * inventory write fires notifyInventoryChange() — the async replacement for
 * the old useSyncExternalStore-over-localStorage pattern. */
function useInventoryResource<T>(fetcher: () => Promise<T>, initial: T, deps: React.DependencyList): AsyncResource<T> {
  const [data, setData] = useState<T>(initial);
  // Only the very first fetch shows a loading state; refetches (deps change,
  // or an inventory write elsewhere) update data in place once ready.
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

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

  useEffect(() => subscribeInventory(refetch), [refetch]);

  return { data, loading, refetch };
}

export function useCustomerInventory(customerId: string): AsyncResource<CustomerInventory[]> {
  return useInventoryResource(() => getCustomerInventoryList(customerId), [], [customerId]);
}

export function useHasInventoryRecords(customerId: string): AsyncResource<boolean> {
  const { data, loading, refetch } = useCustomerInventory(customerId);
  return { data: data.length > 0, loading, refetch };
}

export function useCustomerTransactions(customerId: string): AsyncResource<InventoryTransaction[]> {
  return useInventoryResource(() => getTransactionsForCustomer(customerId), [], [customerId]);
}

export function useCustomerCheckIns(customerId: string): AsyncResource<DailyCheckIn[]> {
  return useInventoryResource(() => getCheckInsForCustomer(customerId), [], [customerId]);
}

export function useTodayCheckIn(customerId: string): AsyncResource<DailyCheckIn | undefined> {
  return useInventoryResource(() => getTodayCheckIn(customerId), undefined, [customerId]);
}

export function useAlertsForCustomer(customerId: string): AsyncResource<RepurchaseAlert[]> {
  return useInventoryResource(() => getAlertsForCustomer(customerId), [], [customerId]);
}

export function useActiveAlerts(): AsyncResource<RepurchaseAlert[]> {
  return useInventoryResource(() => getActiveAlerts(), [], []);
}

export function useTodayMeals(customerId: string): AsyncResource<MealEntry[]> {
  return useInventoryResource(() => getTodayMeals(customerId), [], [customerId]);
}

export function useInventoryForCustomers(customerIds: string[]): AsyncResource<Record<string, CustomerInventory[]>> {
  return useInventoryResource(() => getInventoryForCustomers(customerIds), {}, [customerIds.join(",")]);
}

export function useCheckInsForCustomers(customerIds: string[]): AsyncResource<Record<string, DailyCheckIn[]>> {
  return useInventoryResource(() => getCheckInsForCustomers(customerIds), {}, [customerIds.join(",")]);
}

export function useTransactionsForCustomers(customerIds: string[]): AsyncResource<Record<string, InventoryTransaction[]>> {
  return useInventoryResource(() => getTransactionsForCustomers(customerIds), {}, [customerIds.join(",")]);
}

export function useTodayMealsForCustomers(customerIds: string[]): AsyncResource<Record<string, MealEntry[]>> {
  return useInventoryResource(() => getTodayMealsForCustomers(customerIds), {}, [customerIds.join(",")]);
}
