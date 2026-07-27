"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useHealthCollection } from "@/lib/health-collection/hooks";
import type { BadgeView } from "@/lib/health-collection/types";
import { GrowthCard } from "@/components/health-collection/GrowthCard";
import { BadgeCard } from "@/components/health-collection/BadgeCard";
import { BadgeDetailSheet } from "@/components/health-collection/BadgeDetailSheet";
import { UpgradePopup } from "@/components/health-collection/UpgradePopup";

/**
 * 🌸 Glowing You — the growth hub.
 *
 * Emotion before information: every visit opens on a celebratory Growth Card;
 * tapping into 我的旅程 reveals the healthy habits you're building. Glowing You
 * is also the single entry point to Hidden Discovery — a link here opens the
 * permanent Discovery Collection, which stays its own distinct screen. Habits
 * (growth) and Discovery (recognition) remain separate experiences; they just
 * share this one doorway. Hidden Discovery has no nav tab of its own.
 */
export default function GlowingYouPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { badges, loading, summary, message, upgrade, dismissUpgrade } = useHealthCollection(customerId);
  const [view, setView] = useState<"growth" | "journey">("growth");
  const [selected, setSelected] = useState<BadgeView | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  if (view === "growth") {
    return (
      <GrowthCard
        summary={summary}
        message={message}
        onView={() => setView("journey")}
        onLater={() => setView("journey")}
      />
    );
  }

  return (
    <div className="px-4 pb-12 md:px-8">
      <header className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setView("growth")}
          aria-label="返回"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          ‹
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">🌸 我的旅程</h1>
          <p className="text-xs text-slate-400">每一个习惯，都在让你更闪耀一点。</p>
        </div>
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
          <p className="text-xs text-slate-400">你旅程中，被看见的那些时刻。</p>
        </div>
        <span className="text-slate-300">›</span>
      </Link>

      <BadgeDetailSheet badge={selected} onClose={() => setSelected(null)} />
      {upgrade && <UpgradePopup upgrade={upgrade} onDismiss={dismissUpgrade} />}
    </div>
  );
}
