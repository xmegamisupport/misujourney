"use client";

import { useSyncExternalStore } from "react";

const WATER_KEY = "misu-water-intake";
const CHANGE_EVENT = "misu-daily-progress-change";

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Keyed by customerId so switching accounts on the same browser (or a
 * fresh registration right after testing another account) never carries
 * over a previous account's water total. */
function waterKey(customerId: string): string {
  return `${WATER_KEY}:${customerId}`;
}

export function addWater(customerId: string, amountMl: number, baseline: number, target: number) {
  const key = waterKey(customerId);
  const raw = localStorage.getItem(key);
  const current = raw !== null ? Number(raw) : baseline;
  const next = Math.max(0, Math.min(target, current + amountMl));
  localStorage.setItem(key, String(next));
  emitChange();
}

export function useWaterIntake(customerId: string, baseline: number, target: number): number {
  const key = waterKey(customerId);
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key),
    () => null,
  );
  const value = raw !== null ? Number(raw) : baseline;
  return Math.max(0, Math.min(target, value));
}
