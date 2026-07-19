"use client";

import { useEffect, useState } from "react";
import type { JourneyPointAward } from "@/lib/journey-points/types";

const AWARD_DURATION_MS = 2100;

/** The small moment of achievement.
 *
 * Awards are shown ONE at a time, in order, rather than stacked: finishing the
 * last of five tasks can settle several at once, and five cards appearing
 * together reads as a system report rather than a reward. Queued, they read as
 * a short run of good news.
 *
 * Placed low on the screen, above the tab bar — it must never cover the thing
 * the customer just completed, and it must never need dismissing. */
export function JourneyPointsToast({ awards, onDone }: { awards: JourneyPointAward[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);

  // Restart the queue when a NEW batch arrives. Adjusted during render rather
  // than in an effect: the queue position is derived from which batch we are
  // showing, so resetting it is not a side effect to synchronise afterwards.
  const [shownBatch, setShownBatch] = useState(awards);
  if (shownBatch !== awards) {
    setShownBatch(awards);
    setIndex(0);
  }

  useEffect(() => {
    if (awards.length === 0) return;
    const timer = setTimeout(() => {
      if (index + 1 < awards.length) {
        setIndex((i) => i + 1);
      } else {
        onDone();
      }
    }, AWARD_DURATION_MS);
    return () => clearTimeout(timer);
  }, [awards, index, onDone]);

  if (awards.length === 0) return null;
  const award = awards[index];
  if (!award) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4"
    >
      <div
        // Keyed so each award re-triggers the animation instead of swapping
        // text inside a card that has already finished animating.
        key={`${award.action}-${index}`}
        className="journey-points-toast flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/95 px-4 py-3 shadow-lg shadow-emerald-900/5 backdrop-blur"
      >
        <span className="text-xl">{award.emoji}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-emerald-600">
            +{award.points} <span className="text-xs font-semibold">Journey Points</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{award.label}</p>
        </div>
      </div>
    </div>
  );
}
