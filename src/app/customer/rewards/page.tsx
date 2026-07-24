"use client";

import { useState } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useHealthCollection } from "@/lib/health-collection/hooks";
import type { BadgeView } from "@/lib/health-collection/types";
import { GrowthCard } from "@/components/health-collection/GrowthCard";
import { BadgeCard } from "@/components/health-collection/BadgeCard";
import { BadgeDetailSheet } from "@/components/health-collection/BadgeDetailSheet";
import { UpgradePopup } from "@/components/health-collection/UpgradePopup";
import { SecretSection } from "@/components/health-collection/SecretSection";

/**
 * 🌸 Glowing You — the most rewarding page in MISU Journey.
 *
 * Emotion before information, and discovery before explanation: every visit
 * opens on a celebratory Growth Card; tapping into 我的旅程 reveals a single
 * scrolling page — the six healthy habits you're building, then the Secret
 * Achievements still waiting to be discovered. The overview only teases; all
 * detail lives one tap deeper.
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

      {/* Healthy Habits — the foundation, always first */}
      <section className="mt-5">
        <h2 className="mb-3 text-base font-bold text-slate-800">健康习惯</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {badges.map((b) => (
            <BadgeCard key={b.def.id} badge={b} onClick={() => setSelected(b)} />
          ))}
        </div>
      </section>

      {/* Secret Achievements — the surprises still waiting */}
      <SecretSection />

      <BadgeDetailSheet badge={selected} onClose={() => setSelected(null)} />
      {upgrade && <UpgradePopup upgrade={upgrade} onDismiss={dismissUpgrade} />}
    </div>
  );
}
