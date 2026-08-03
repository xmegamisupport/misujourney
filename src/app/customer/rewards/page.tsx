"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useHealthCollection } from "@/lib/health-collection/hooks";
import { todayDateStr } from "@/lib/inventory/engine";
import type { BadgeView } from "@/lib/health-collection/types";
import { GrowthCard } from "@/components/health-collection/GrowthCard";
import { BadgeCard } from "@/components/health-collection/BadgeCard";
import { BadgeDetailSheet } from "@/components/health-collection/BadgeDetailSheet";
import { UpgradePopup } from "@/components/health-collection/UpgradePopup";
import { DiscoveryMoment } from "@/components/hidden-discovery/DiscoveryMoment";
import {
  getDiscoveryGallery,
  ambientFor,
  type GalleryItem,
  type DiscoveredItem,
  type MysteryItem,
} from "@/lib/discovery/reveal";

const greetingKey = () => `misu-greeting-seen:${todayDateStr()}`;
const noSubscribe = () => () => {};

/** A discovered moment: full-colour ambient, its name, the day it was found. */
function DiscoveredTile({ item, onClick }: { item: DiscoveredItem; onClick: () => void }) {
  const a = ambientFor(item.category ?? "", item.code);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center"
    >
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full text-[26px] transition-transform duration-500 ease-soft group-hover:-translate-y-0.5 group-active:scale-95"
        style={{ background: `linear-gradient(140deg, ${a.from}, ${a.to})`, boxShadow: `0 10px 24px -12px ${a.ring}` }}
      >
        {item.icon}
      </span>
      <span className="text-[11px] font-semibold leading-tight text-ink">{item.name}</span>
      <span className="text-[9px] font-medium tracking-wide text-ink-faint tabular-nums">
        {item.discoveredAt?.slice(0, 10)}
      </span>
    </button>
  );
}

/** A Mystery Discovery: masked face (❔ ????????) + one rotating curiosity hint.
 *  Never a name, icon, condition, or progress — only enough to make you wonder. */
function MysteryTile({ item, onClick }: { item: MysteryItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-line bg-line-soft text-[26px] transition-transform duration-500 ease-soft group-hover:-translate-y-0.5 group-active:scale-95">
        <span className="opacity-40">❔</span>
      </span>
      <span className="text-[11px] font-semibold tracking-[0.2em] text-ink-faint">??????</span>
      <span className="line-clamp-2 max-w-[7.5rem] text-[10px] italic leading-snug text-ink-soft">{item.hint}</span>
    </button>
  );
}

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
  const discovered = gallery.filter((g): g is DiscoveredItem => g.discovered);
  const mysteries = gallery.filter((g): g is MysteryItem => !g.discovered);

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-tint border-t-brand" />
      </div>
    );
  }

  if (view === "greeting") {
    return <GrowthCard summary={summary} message={message} onView={seeGreetingDone} onLater={seeGreetingDone} />;
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 pb-28 pt-2">
      {/* A whisper of brand pink at the crown — atmosphere, not a wash. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(90%_100%_at_20%_0%,#fce9ef_0%,transparent_72%)]"
      />

      <div className="relative">
        <header className="misu-rise flex items-start justify-between gap-3 pt-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-deep">Glowing You</p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-ink">我的旅程</h1>
            <p className="mt-0.5 text-xs text-ink-soft">每一个习惯，都在让你更闪耀一点。</p>
          </div>
          <button
            type="button"
            onClick={() => setOverride("greeting")}
            className="shrink-0 rounded-full border border-brand-soft/60 bg-brand-tint px-3.5 py-1.5 text-xs font-semibold text-brand-deep transition duration-500 ease-soft hover:-translate-y-0.5 active:scale-95"
          >
            ✨ 今日寄语
          </button>
        </header>

        {/* Healthy Habits — daily growth */}
        <section className="misu-rise mt-6" style={{ animationDelay: "60ms" }}>
          <h2 className="mb-3 flex items-baseline gap-2 text-[15px] font-bold text-ink">
            健康习惯 <span className="text-[11px] font-medium text-ink-faint">· 成长</span>
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {badges.map((b) => (
              <BadgeCard key={b.def.id} badge={b} onClick={() => setSelected(b)} />
            ))}
          </div>
        </section>

        {/* Hidden Discovery — browse, don't read. Two groups: what you've found,
            and a rotating few still waiting. Curiosity, never a checklist. */}
        {discovered.length > 0 && (
          <section className="misu-rise mt-8" style={{ animationDelay: "120ms" }}>
            <h2 className="mb-3 text-[15px] font-bold text-ink">🌟 已发现的时刻</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {discovered.map((it) => (
                <DiscoveredTile key={it.code} item={it} onClick={() => setMoment(it)} />
              ))}
            </div>
          </section>
        )}

        {mysteries.length > 0 && (
          <section className="misu-rise mt-8" style={{ animationDelay: "180ms" }}>
            <h2 className="text-[15px] font-bold text-ink">✨ 等待被发现</h2>
            <p className="mb-3 mt-0.5 text-xs text-ink-soft">旅程里，还藏着一些谜一样的时刻，等你亲手揭开。</p>
            <div className="grid grid-cols-3 gap-1.5">
              {mysteries.map((it) => (
                <MysteryTile key={it.mysteryId} item={it} onClick={() => setMoment(it)} />
              ))}
            </div>
          </section>
        )}
      </div>

      <BadgeDetailSheet badge={selected} onClose={() => setSelected(null)} />
      {upgrade && <UpgradePopup upgrade={upgrade} onDismiss={dismissUpgrade} />}
      {moment && <DiscoveryMoment item={moment} onClose={() => setMoment(null)} />}
    </div>
  );
}
