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
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">🌱 Journey 起点</p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        未来的改变，都会从这里开始。你还有未完成的 Journey 起点。完成后，可获得额外 Journey Points 奖励。
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Link
          href="/customer/journey-start"
          className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
        >
          继续完成
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
        >
          以后再完成
        </button>
      </div>
    </div>
  );
}
