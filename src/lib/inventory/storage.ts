"use client";

import type { CustomerInventory, DailyCheckIn, InventoryTransaction, RepurchaseAlert } from "./types";

const CHANGE_EVENT = "misu-inventory-change";

const INVENTORY_KEY = "misu-customer-inventory";
const TRANSACTIONS_KEY = "misu-inventory-transactions";
const CHECKINS_KEY = "misu-daily-checkins";
const ALERTS_KEY = "misu-repurchase-alerts";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function notifyInventoryChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeInventory(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Every collection is stored as ONE JSON blob keyed by customerId, so a
 * single engine operation reads the full map, mutates in memory, and writes
 * it back with one localStorage.setItem call per collection. Combined with
 * JS's single-threaded/synchronous execution (no `await` inside engine ops),
 * this is the closest approximation of an atomic transaction that a
 * browser-only localStorage store can offer — there is no real cross-tab or
 * cross-device concurrency safety, which is the fundamental limitation of
 * this Phase 2 simulation (see conversation notes: a real backend would use
 * an actual DB transaction + unique constraint instead).
 */
export type InventoryMap = Record<string, CustomerInventory[]>;
export type TransactionMap = Record<string, InventoryTransaction[]>;
export type CheckInMap = Record<string, DailyCheckIn[]>;

export function getInventoryMap(): InventoryMap {
  return readJSON(INVENTORY_KEY, {});
}
export function setInventoryMap(data: InventoryMap) {
  writeJSON(INVENTORY_KEY, data);
}

export function getTransactionMap(): TransactionMap {
  return readJSON(TRANSACTIONS_KEY, {});
}
export function setTransactionMap(data: TransactionMap) {
  writeJSON(TRANSACTIONS_KEY, data);
}

export function getCheckInMap(): CheckInMap {
  return readJSON(CHECKINS_KEY, {});
}
export function setCheckInMap(data: CheckInMap) {
  writeJSON(CHECKINS_KEY, data);
}

export function getAlerts(): RepurchaseAlert[] {
  return readJSON(ALERTS_KEY, []);
}
export function setAlerts(data: RepurchaseAlert[]) {
  writeJSON(ALERTS_KEY, data);
}

/**
 * Raw JSON string readers for React's useSyncExternalStore. getSnapshot must
 * return a referentially-stable value when nothing changed — JSON.parse
 * always allocates a new object/array, which would make every render look
 * like a change and infinite-loop. Reading the raw string (a primitive) and
 * parsing it inside the hook, after the snapshot comparison, avoids that.
 */
export function getInventoryMapRaw(): string {
  if (typeof window === "undefined") return "{}";
  return localStorage.getItem(INVENTORY_KEY) ?? "{}";
}
export function getTransactionMapRaw(): string {
  if (typeof window === "undefined") return "{}";
  return localStorage.getItem(TRANSACTIONS_KEY) ?? "{}";
}
export function getCheckInMapRaw(): string {
  if (typeof window === "undefined") return "{}";
  return localStorage.getItem(CHECKINS_KEY) ?? "{}";
}
export function getAlertsRaw(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(ALERTS_KEY) ?? "[]";
}
