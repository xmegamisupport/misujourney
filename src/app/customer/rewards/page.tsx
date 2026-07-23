"use client";

import { useState } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useHealthCollection } from "@/lib/health-collection/hooks";
import type { BadgeView } from "@/lib/health-collection/types";
import { BadgeCard } from "@/components/health-collection/BadgeCard";
import { BadgeDetailSheet } from "@/components/health-collection/BadgeDetailSheet";
import { UpgradePopup } from "@/components/health-collection/UpgradePopup";

/**
 * Health Collection — the gamification section (customer nav "rewards" slot).
 *
 * Phase 1: ⭐ Master Badges (built) + 🎁 Secret Achievements (Coming Soon).
 * Master Badges reward long-term healthy HABITS, not weight-loss results, and
 * every one is verified automatically from data MISU already stores.
 */
export default function HealthCollectionPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { badges, loading, upgrade, dismissUpgrade } = useHealthCollection(customerId);
  const [tab, setTab] = useState<"master" | "secret">("master");
  const [selected, setSelected] = useState<BadgeView | null>(null);

  return (
    <div className="px-4 pb-10 md:px-8">
      <header className="pt-1">
        <h1 className="text-xl font-bold text-slate-900">健康收藏</h1>
        <p className="mt-1 text-sm text-slate-500">奖励的是每天的健康习惯，而不是体重的结果。</p>
      </header>

      {/* segmented tabs */}
      <div className="mt-4 flex gap-1 rounded-2xl bg-slate-100 p-1">
        <TabButton active={tab === "master"} onClick={() => setTab("master")}>
          ⭐ 大师徽章
        </TabButton>
        <TabButton active={tab === "secret"} onClick={() => setTab("secret")}>
          🎁 神秘成就
        </TabButton>
      </div>

      {tab === "master" ? (
        <section className="mt-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[188px] animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {badges.map((b) => (
                <BadgeCard key={b.def.id} badge={b} onClick={() => setSelected(b)} />
              ))}
            </div>
          )}

          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-400">
            每一枚徽章都会一直升级 —— 铜 · 银 · 金 · 铂金 · 钻石 · 传奇。<br />
            累计计算，错过一天也不会失去进度。
          </p>
        </section>
      ) : (
        <section className="mt-5 flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 px-6 text-center">
          <span className="text-4xl">🎁</span>
          <p className="mt-3 text-base font-semibold text-slate-700">神秘成就</p>
          <p className="mt-1 max-w-xs text-sm text-slate-400">
            隐藏的惊喜成就，在你意想不到的时刻解锁。
          </p>
          <span className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            敬请期待
          </span>
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
