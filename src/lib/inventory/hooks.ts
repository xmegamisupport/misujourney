"use client";

import { useSyncExternalStore } from "react";
import {
  subscribeInventory,
  getInventoryMapRaw,
  getTransactionMapRaw,
  getCheckInMapRaw,
  getAlertsRaw,
  type InventoryMap,
  type TransactionMap,
  type CheckInMap,
} from "./storage";
import { todayDateStr } from "./engine";
import type { CustomerInventory, DailyCheckIn, InventoryTransaction, RepurchaseAlert } from "./types";

function serverEmptyObject() {
  return "{}";
}
function serverEmptyArray() {
  return "[]";
}

export function useCustomerInventory(customerId: string): CustomerInventory[] {
  const raw = useSyncExternalStore(subscribeInventory, getInventoryMapRaw, serverEmptyObject);
  const map = JSON.parse(raw) as InventoryMap;
  return map[customerId] ?? [];
}

export function useHasInventoryRecords(customerId: string): boolean {
  return useCustomerInventory(customerId).length > 0;
}

export function useCustomerTransactions(customerId: string): InventoryTransaction[] {
  const raw = useSyncExternalStore(subscribeInventory, getTransactionMapRaw, serverEmptyObject);
  const map = JSON.parse(raw) as TransactionMap;
  return map[customerId] ?? [];
}

export function useCustomerCheckIns(customerId: string): DailyCheckIn[] {
  const raw = useSyncExternalStore(subscribeInventory, getCheckInMapRaw, serverEmptyObject);
  const map = JSON.parse(raw) as CheckInMap;
  return map[customerId] ?? [];
}

export function useTodayCheckIn(customerId: string): DailyCheckIn | undefined {
  const checkIns = useCustomerCheckIns(customerId);
  const today = todayDateStr();
  return checkIns.find((c) => c.date === today);
}

export function useAlertsForCustomer(customerId: string): RepurchaseAlert[] {
  const raw = useSyncExternalStore(subscribeInventory, getAlertsRaw, serverEmptyArray);
  const list = JSON.parse(raw) as RepurchaseAlert[];
  return list.filter((a) => a.customerId === customerId);
}

export function useActiveAlerts(): RepurchaseAlert[] {
  const raw = useSyncExternalStore(subscribeInventory, getAlertsRaw, serverEmptyArray);
  const list = JSON.parse(raw) as RepurchaseAlert[];
  return list.filter((a) => a.status === "OPEN" || a.status === "FOLLOWED_UP");
}

export function useAllInventory(): InventoryMap {
  const raw = useSyncExternalStore(subscribeInventory, getInventoryMapRaw, serverEmptyObject);
  return JSON.parse(raw) as InventoryMap;
}

export function useAllCheckIns(): CheckInMap {
  const raw = useSyncExternalStore(subscribeInventory, getCheckInMapRaw, serverEmptyObject);
  return JSON.parse(raw) as CheckInMap;
}
