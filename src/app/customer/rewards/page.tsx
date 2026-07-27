"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useHealthCollection } from "@/lib/health-collection/hooks";
import { todayDateStr } from "@/lib/inventory/engine";
import { cn } from "@/lib/utils";
import type { BadgeView } from "@/lib/health-collection/types";
import { GrowthCard } from "@/components/health-collection/GrowthCard";
import { BadgeCard } from "@/components/health-collection/BadgeCard";
import { BadgeDetailSheet } from "@/components/health-collection/BadgeDetailSheet";
import { UpgradePopup } from "@/components/health-collection/UpgradePopup";
import { DiscoveryMoment } from "@/components/hidden-discovery/DiscoveryMoment";
import { getDiscoveryGallery, ambientFor, type GalleryItem } from "@/lib/discovery/reveal";

const greetingKey = () => `misu-greeting-seen:${todayDateStr()}`;
const noSubscribe = () => () => {};

/**
 * 🌸 Glowing You — the user's complete growth space, on one page.
 *
 * Healthy Habits (daily growth) and Hidden Discovery (life moments) live
 * together here — no extra navigation. The Discovery section is a lightweight
 * gallery for BROWSING: each tile is only an icon, a name, and (if discovered)
 * a date — the emotional writing lives one tap deeper, in the moment itself.
 * Undiscovered discoveries appear as visible mysteries (icon + name), never
 * with a condition, progress, rarity, count, or hint. Collection, not checklist.
 *
 * The Greeting Card is a daily ritual (once per day; re-openable via 今日寄语).
 */
export default function GlowingYouPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { badges, loading, summary, message, upgrade, dismissUpgrade } = useHealthCollection(customerId);

  const seenToday = useSyncExternalStore(
    noSubscribe,
    () => localStorage.getItem(greetingKey()) != null,
    () => false,
  );
  const [override, setOverride] = useState<"greeting" | "journey" | null>(null);
  const [selected, setSelected] = useState<BadgeView | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [moment, setMoment] = useState<GalleryItem | null>(null);

  useEffect(() => {
    getDiscoveryGallery()
      .then(setGallery)
      .catch(() => setGallery([]));
  }, []);

  const view = override ?? (seenToday ? "journey" : "greeting");

  function seeGreetingDone() {
    try {
      localStorage.setItem(greetingKey(), "1");
    } catch {
      // private mode — worst case the greeting shows again; harmless
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

      {/* Healthy Habits — daily growth */}
      <section className="mt-5">
        <h2 className="mb-3 text-base font-bold text-slate-800">健康习惯</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {badges.map((b) => (
            <BadgeCard key={b.def.id} badge={b} onClick={() => setSelected(b)} />
          ))}
        </div>
      </section>

      {/* Hidden Discovery — life moments. A gallery to browse, not read. */}
      {gallery.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-base font-bold text-slate-800">✨ 我的发现</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {gallery.map((it) => {
              const disc = it.discovered;
              const a = disc ? ambientFor(it.category ?? "", it.code) : null;
              return (
                <button
                  key={it.code}
                  type="button"
                  onClick={() => setMoment(it)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center transition active:scale-95"
                >
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                    style={
                      disc
                        ? { background: `linear-gradient(140deg, ${a!.from}, ${a!.to})`, boxShadow: `0 8px 22px -12px ${a!.ring}` }
                        : { background: "#f1f5f9" }
                    }
                  >
                    <span style={{ opacity: disc ? 1 : 0.5 }}>{it.icon}</span>
                  </span>
                  <span className={cn("text-[11px] font-medium leading-tight", disc ? "text-slate-700" : "text-slate-400")}>
                    {it.name}
                  </span>
                  {disc && <span className="text-[9px] tracking-wide text-slate-400">{it.discoveredAt?.slice(0, 10)}</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <BadgeDetailSheet badge={selected} onClose={() => setSelected(null)} />
      {upgrade && <UpgradePopup upgrade={upgrade} onDismiss={dismissUpgrade} />}
      {moment && <DiscoveryMoment item={moment} onClose={() => setMoment(null)} />}
    </div>
  );
}
