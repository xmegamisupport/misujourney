"use client";

import { useSyncExternalStore } from "react";
import { translations, type Language } from "./translations";

const STORAGE_KEY = "misu-language";
const CHANGE_EVENT = "misu-language-change";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Language {
  if (typeof window === "undefined") return "zh";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "zh";
}

function getServerSnapshot(): Language {
  return "zh";
}

export function setLanguage(lang: Language) {
  window.localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { language, setLanguage, t: translations[language] };
}
