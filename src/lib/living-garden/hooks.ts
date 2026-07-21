"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { buildGardenState } from "./engine";
import { PLACEHOLDER_CHAPTER } from "./garden-data";
import type { GardenChapter, GardenState } from "./types";

/** Founder-only preview flag, read from the URL: `?preview=1`.
 *
 * The garden is a shipping customer experience; the day scrubber is an internal
 * founder/dev tool that production users must never see. A URL flag is the whole
 * gate — no roles, no backend. useSyncExternalStore keeps SSR honest (server
 * renders false, so there is no hydration mismatch and no setState-in-effect). */
export function usePreviewFlag(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("preview") === "1",
    () => false,
  );
}

/** Top-down foundation-spike flag, read from the URL: `?topdown=1`.
 *
 * Same SSR-safe pattern as the preview flag. When absent (the default for every
 * customer), the garden renders the approved side-view experience unchanged; the
 * top-down prototype only appears with the flag, so the live product is never
 * affected while the new foundation is being validated. */
export function useTopDownFlag(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("topdown") === "1",
    () => false,
  );
}

/** The scene for a given day. Pure derivation over the chapter, memoised so a
 * scrub or autoplay tick only recomputes when the day actually changes. The
 * component that consumes this never learns which day it is — it just gets a
 * GardenState. */
export function useGardenState(day: number, chapter: GardenChapter = PLACEHOLDER_CHAPTER): GardenState {
  return useMemo(() => buildGardenState(chapter, day), [chapter, day]);
}

export interface GardenPreviewController {
  day: number;
  lastDay: number;
  playing: boolean;
  setDay: (day: number) => void;
  next: () => void;
  prev: () => void;
  togglePlay: () => void;
}

const AUTOPLAY_MS = 1000; // ~1 second per day, per the founder-preview spec

/** Founder-preview state: the current day, prev/next, and an autoplay that
 * steps one day per second and stops at the end. This is a review tool for
 * pacing, not scene animation — it just advances a number; the scene rerenders
 * instantly from it, with no page refresh. */
export function useGardenPreview(chapter: GardenChapter = PLACEHOLDER_CHAPTER, initialDay = 1): GardenPreviewController {
  const lastDay = chapter.lastDay;
  // Opens at the customer's real progress into the chapter; the founder scrubber
  // can still move freely from there. Clamped so a stray value can't land the
  // scene off the authored range.
  const [day, setDayRaw] = useState(() => Math.max(1, Math.min(lastDay, Math.round(initialDay))));
  const [playing, setPlaying] = useState(false);

  const setDay = useCallback(
    (next: number) => setDayRaw(Math.max(1, Math.min(lastDay, Math.round(next)))),
    [lastDay],
  );
  const next = useCallback(() => setDay(day + 1), [day, setDay]);
  const prev = useCallback(() => setDay(day - 1), [day, setDay]);
  const togglePlay = useCallback(() => {
    // Restart from day 1 if pressed at the end, so "play" always shows growth.
    setPlaying((p) => {
      if (!p && day >= lastDay) setDayRaw(1);
      return !p;
    });
  }, [day, lastDay]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setDayRaw((d) => {
        if (d >= lastDay) {
          setPlaying(false);
          return d;
        }
        return d + 1;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [playing, lastDay]);

  return { day, lastDay, playing, setDay, next, prev, togglePlay };
}
