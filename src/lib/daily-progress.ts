"use client";

import { useSyncExternalStore } from "react";
import { useAddedMeals } from "./added-meals";
import type { CustomerProfile, DailyTask } from "./types";

const WATER_KEY = "misu-water-intake";
const CHECKIN_KEY = "misu-checkin-done";
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

export function addWater(amountMl: number, baseline: number, target: number) {
  const raw = localStorage.getItem(WATER_KEY);
  const current = raw !== null ? Number(raw) : baseline;
  const next = Math.max(0, Math.min(target, current + amountMl));
  localStorage.setItem(WATER_KEY, String(next));
  emitChange();
}

export function useWaterIntake(baseline: number, target: number): number {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(WATER_KEY),
    () => null,
  );
  const value = raw !== null ? Number(raw) : baseline;
  return Math.max(0, Math.min(target, value));
}

export function setCheckinDone() {
  localStorage.setItem(CHECKIN_KEY, "1");
  emitChange();
}

export function useCheckinDone(): boolean {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(CHECKIN_KEY),
    () => null,
  );
  return raw === "1";
}

/**
 * Every task's `done` state is derived entirely from real recorded actions —
 * there is no manual tick. Add a new signal here as new actions become trackable.
 */
export function useTodayTasks(customer: CustomerProfile): DailyTask[] {
  const addedMeals = useAddedMeals();
  const water = useWaterIntake(customer.nutritionToday.water, customer.nutritionToday.waterTarget);
  const checkinDone = useCheckinDone();

  const breakfastLogged =
    customer.meals.some((m) => m.type === "breakfast") || addedMeals.some((m) => m.type === "breakfast");
  const dinnerLogged = addedMeals.some((m) => m.type === "dinner");
  const waterDone = water >= customer.nutritionToday.waterTarget;

  return customer.tasks.map((t) => {
    if (t.id === "t1") return { ...t, done: t.done || breakfastLogged };
    if (t.id === "t2") return { ...t, done: waterDone, description: `已喝 ${water}ml / ${customer.nutritionToday.waterTarget}ml` };
    if (t.id === "t3") return { ...t, done: t.done || checkinDone };
    if (t.id === "t5") return { ...t, done: t.done || dinnerLogged };
    return t;
  });
}
