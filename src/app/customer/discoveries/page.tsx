"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDiscoveryCollection, ambientFor, type CollectionItem } from "@/lib/discovery/reveal";

/**
 * The permanent Discovery Collection — recognition, not achievement.
 * Only discovered moments appear here: name · recognition message · date.
 * Nothing is teased before it is discovered; there is no locked gallery.
 */
export default function DiscoveryCollectionPage() {
  const [items, setItems] = useState<CollectionItem[] | null>(null);

  useEffect(() => {
    getDiscoveryCollection().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div className="px-4 pb-16 md:px-8">
      <header className="flex items-center gap-2 pt-2">
        <Link
          href="/customer/rewards"
          aria-label="返回 Glowing You"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          ‹
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">✨ 我的发现</h1>
          <p className="mt-0.5 text-xs text-slate-400">这里收藏着，你旅程中被看见的时刻。</p>
        </div>
      </header>

      {items === null ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center px-6 text-center">
          <span className="mb-4 text-4xl opacity-70">🌙</span>
          <p className="text-sm font-medium text-slate-500">还没有发现</p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-400">
            继续走你的旅程。当你在不经意间成长时，我们会在这里，为你悄悄记下。
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((it) => {
            const a = ambientFor(it.category, it.code);
            return (
              <article
                key={it.code}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                <div
                  className="flex items-center gap-3 px-4 pt-4"
                  style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
                >
                  <span
                    className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl"
                    style={{ background: "rgba(255,255,255,0.7)", boxShadow: `0 10px 24px -12px ${a.ring}` }}
                  >
                    {it.icon}
                  </span>
                  <p className="mb-4 text-base font-bold text-slate-800">{it.name}</p>
                </div>
                <div className="px-4 pb-4 pt-3">
                  <p className="text-[13px] leading-relaxed text-slate-600">{it.message}</p>
                  <p className="mt-3 text-[11px] text-slate-400">
                    发现于 {it.discoveredAt?.slice(0, 10)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
