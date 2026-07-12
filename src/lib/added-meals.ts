"use client";

import { useSyncExternalStore } from "react";
import type { MealEntry } from "./types";

const STORAGE_KEY = "misu-added-meals";
const CHANGE_EVENT = "misu-added-meals-change";

function readAll(): MealEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MealEntry[]) : [];
  } catch {
    return [];
  }
}

export function addMeal(meal: MealEntry) {
  const meals = readAll().filter((m) => m.type !== meal.type);
  meals.push(meal);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
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

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function getServerSnapshot() {
  return "[]";
}

export function useAddedMeals(): MealEntry[] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  try {
    return JSON.parse(raw) as MealEntry[];
  } catch {
    return [];
  }
}
