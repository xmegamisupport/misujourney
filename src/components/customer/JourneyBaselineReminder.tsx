"use client";

import { useState } from "react";
import Link from "next/link";
import { useJourneyBaselineStatus } from "@/lib/baseline/hooks";

/** Persistent Dashboard reminder shown until BOTH Journey Baseline items are
 * done, then it retires for good. Never blocks the Dashboard — "以后再完成"
 * softly dismisses it for this visit; it returns next time until completed. */
export function JourneyBaselineReminder({ customerId }: { customerId: string }) {
  const { status } = useJourneyBaselineStatus(customerId);
  const [dismissed, setDismissed] = useState(false);

  // Only render once we know it's genuinely incomplete (avoid a flash before
  // status loads), and never once complete.
  if (!status.loaded || status.complete || dismissed) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">🌱</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">Journey 起点</p>
          {/* Why now, not "someday" — a starting point captured late is no
              longer a true starting point. Encouraging, never pressuring. */}
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">留下你的起点，之后才能看见真正的改变。</p>
        </div>
        <Link
          href="/customer/journey-start"
          className="mt-0.5 shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
        >
          继续 →
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="mt-2 w-full text-center text-[11px] font-medium text-slate-400 transition hover:text-slate-600"
      >
        以后再完成
      </button>
    </div>
  );
}
