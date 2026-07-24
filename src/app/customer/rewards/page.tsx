"use client";

import { useState } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useHealthCollection } from "@/lib/health-collection/hooks";
import type { BadgeView } from "@/lib/health-collection/types";
import { GrowthCard } from "@/components/health-collection/GrowthCard";
import { BadgeCard } from "@/components/health-collection/BadgeCard";
import { BadgeDetailSheet } from "@/components/health-collection/BadgeDetailSheet";
import { UpgradePopup } from "@/components/health-collection/UpgradePopup";

/**
 * 🌸 Glowing You — the most rewarding page in MISU Journey.
 *
 * Emotion before information: every visit opens on a celebratory Growth Card;
 * only when the customer taps "查看我的旅程" do the habits appear. The habits
 * reward long-term healthy behaviour, never weight-loss results, and every one
 * is verified automatically from data MISU already stores.
 */
export default function GlowingYouPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { badges, loading, summary, message, upgrade, dismissUpgrade } = useHealthCollection(customerId);
  const [view, setView] = useState<"growth" | "journey">("growth");
  const [tab, setTab] = useState<"master" | "secret">("master");
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
    <div className="px-4 pb-10 md:px-8">
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

      <div className="mt-4 flex gap-1 rounded-2xl bg-slate-100 p-1">
        <TabButton active={tab === "master"} onClick={() => setTab("master")}>
          ⭐ 健康习惯
        </TabButton>
        <TabButton active={tab === "secret"} onClick={() => setTab("secret")}>
          🎁 神秘成就
        </TabButton>
      </div>

      {tab === "master" ? (
        <section className="mt-5">
          <div className="grid grid-cols-3 gap-2.5">
            {badges.map((b) => (
              <BadgeCard key={b.def.id} badge={b} onClick={() => setSelected(b)} />
            ))}
          </div>
          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-400">
            每个习惯都会慢慢成长 —— Beginner · Builder · Progress · Achiever · Elite · Master。<br />
            累计计算，错过一天也不会失去进度。
          </p>
        </section>
      ) : (
        <section className="mt-5 flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 px-6 text-center">
          <span className="text-4xl">🎁</span>
          <p className="mt-3 text-base font-semibold text-slate-700">神秘成就</p>
          <p className="mt-1 max-w-xs text-sm text-slate-400">隐藏的惊喜成就，在你意想不到的时刻解锁。</p>
          <span className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">敬请期待</span>
        </section>
      )}

      <BadgeDetailSheet badge={selected} onClose={() => setSelected(null)} />
      {upgrade && <UpgradePopup upgrade={upgrade} onDismiss={dismissUpgrade} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
