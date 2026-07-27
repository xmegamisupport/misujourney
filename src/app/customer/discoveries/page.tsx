"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDiscoveryCollection, ambientFor, type CollectionItem } from "@/lib/discovery/reveal";
import { DiscoveryMoment } from "@/components/hidden-discovery/DiscoveryMoment";

/**
 * 我的发现 — a personal museum of moments, not a dashboard.
 *
 * Only discovered moments appear (nothing is teased before it is discovered).
 * Each moment is its own framed exhibit with its own atmosphere; tapping one
 * opens it up close to reread and remember. The page is built to be revisited
 * slowly, a year from now, and still feel like "these are my memories".
 */
export default function DiscoveryCollectionPage() {
  const [items, setItems] = useState<CollectionItem[] | null>(null);
  const [open, setOpen] = useState<CollectionItem | null>(null);

  useEffect(() => {
    getDiscoveryCollection()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="px-4 pb-20 md:px-8">
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
          <p className="mt-0.5 text-xs text-slate-400">轻轻翻看，那些旅程中被看见的时刻。</p>
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
        <div className="mt-6 flex flex-col gap-5">
          {items.map((it) => {
            const a = ambientFor(it.category, it.code);
            return (
              <button
                key={it.code}
                type="button"
                onClick={() => setOpen(it)}
                className="relative w-full overflow-hidden rounded-[1.75rem] border border-white/70 p-6 text-left shadow-[0_16px_44px_-26px_rgba(15,23,42,0.45)] transition active:scale-[0.99]"
                style={{ background: `linear-gradient(140deg, ${a.from}, ${a.to})` }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-2xl"
                  style={{ background: a.glow, opacity: 0.4 }}
                />
                <div className="relative flex items-start gap-4">
                  <span
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-4xl"
                    style={{ background: "rgba(255,255,255,0.78)", boxShadow: `0 12px 30px -14px ${a.ring}` }}
                  >
                    {it.icon}
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-lg font-bold text-slate-800">{it.name}</p>
                    <p className="mt-2 line-clamp-3 font-serif text-[13.5px] leading-relaxed text-slate-600">{it.message}</p>
                    <p className="mt-3 text-[11px] tracking-widest text-slate-400">发现于 {it.discoveredAt?.slice(0, 10)}</p>
                  </div>
                </div>
              </button>
            );
          })}
          <p className="mt-3 text-center text-[11px] tracking-widest text-slate-300">· 你旅程的收藏 ·</p>
        </div>
      )}

      {open && <DiscoveryMoment item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
