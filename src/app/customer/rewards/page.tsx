"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useHealthCollection } from "@/lib/health-collection/hooks";
import { todayDateStr } from "@/lib/inventory/engine";
import type { BadgeView } from "@/lib/health-collection/types";
import { GrowthCard } from "@/components/health-collection/GrowthCard";
import { BadgeCard } from "@/components/health-collection/BadgeCard";
import { BadgeDetailSheet } from "@/components/health-collection/BadgeDetailSheet";
import { UpgradePopup } from "@/components/health-collection/UpgradePopup";

const greetingKey = () => `misu-greeting-seen:${todayDateStr()}`;
// We only read the flag once per mount; no need to react to writes.
const noSubscribe = () => () => {};

/**
 * 🌸 Glowing You — the growth hub.
 *
 * The Greeting Card is a DAILY RITUAL: it opens once on the first visit each day,
 * then later visits go straight into 我的旅程. A quiet "今日寄语" button re-opens
 * today's greeting on demand. Glowing You is also the single doorway to Hidden
 * Discovery — a link opens the permanent Collection (its own distinct screen).
 * Habits (growth) and Discovery (recognition) stay separate experiences.
 */
export default function GlowingYouPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { badges, loading, summary, message, upgrade, dismissUpgrade } = useHealthCollection(customerId);

  // Was today's greeting already seen? (localStorage, SSR-safe via external store.)
  const seenToday = useSyncExternalStore(
    noSubscribe,
    () => localStorage.getItem(greetingKey()) != null,
    () => false,
  );
  // Manual override: user finished the greeting, or tapped 今日寄语 to reopen it.
  const [override, setOverride] = useState<"greeting" | "journey" | null>(null);
  const [selected, setSelected] = useState<BadgeView | null>(null);

  const view = override ?? (seenToday ? "journey" : "greeting");

  function seeGreetingDone() {
    try {
      localStorage.setItem(greetingKey(), "1");
    } catch {
      // private mode etc. — worst case the greeting shows again; harmless
    }
    setOverride("journey");
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  if (view === "greeting") {
    return <GrowthCard summary={summary} message={message} onView={seeGreetingDone} onLater={seeGreetingDone} />;
  }

  return (
    <div className="px-4 pb-12 md:px-8">
      <header className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-lg font-bold text-slate-900">🌸 我的旅程</h1>
          <p className="text-xs text-slate-400">每一个习惯，都在让你更闪耀一点。</p>
        </div>
        <button
          type="button"
          onClick={() => setOverride("greeting")}
          className="shrink-0 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-500 transition hover:bg-rose-100"
        >
          ✨ 今日寄语
        </button>
      </header>

      {/* Healthy Habits — the growth system */}
      <section className="mt-5">
        <h2 className="mb-3 text-base font-bold text-slate-800">健康习惯</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {badges.map((b) => (
            <BadgeCard key={b.def.id} badge={b} onClick={() => setSelected(b)} />
          ))}
        </div>
      </section>

      {/* The one doorway into Hidden Discovery — a distinct recognition system.
          No teasing: this only points to what has already been discovered. */}
      <Link
        href="/customer/discoveries"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 shadow-sm transition hover:border-indigo-200"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm">✨</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">我的发现</p>
          <p className="text-xs text-slate-400">这里收藏着，旅程中被看见的时刻。</p>
        </div>
        <span className="text-slate-300">›</span>
      </Link>

      <BadgeDetailSheet badge={selected} onClose={() => setSelected(null)} />
      {upgrade && <UpgradePopup upgrade={upgrade} onDismiss={dismissUpgrade} />}
    </div>
  );
}
