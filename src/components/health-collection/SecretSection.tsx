"use client";

import { useEffect, useState } from "react";
import type { DiscoveredItem, DiscoveryClue } from "@/lib/discovery/types";

/**
 * Secret Achievements — the discovery layer. Discovered items (colour) and
 * still-hidden clues (grey mysteries with their current hint) share one grid,
 * so the page always shows both "what I've found" and "what's still waiting".
 * The overview only teases; a tap gives a little more (a hint, or the story of
 * a discovery) — never the exact condition.
 */
export function SecretSection({
  clues,
  discovered,
}: {
  clues: DiscoveryClue[];
  discovered: DiscoveredItem[];
}) {
  const [item, setItem] = useState<DiscoveredItem | null>(null);
  const [clue, setClue] = useState<DiscoveryClue | null>(null);

  return (
    <section className="mt-8">
      <h2 className="text-base font-bold text-slate-800">🎁 神秘成就</h2>
      <p className="mb-3 text-[11px] text-slate-400">有些成长，不会提前揭晓。</p>

      <div className="grid grid-cols-3 gap-2.5">
        {discovered.map((d) => (
          <button
            key={d.code}
            type="button"
            onClick={() => setItem(d)}
            className="flex flex-col items-center rounded-2xl border border-emerald-100 bg-white px-1 py-4 text-center transition active:scale-[0.96]"
          >
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-emerald-50 text-2xl">
              {d.icon}
            </span>
            <p className="mt-2 text-[12px] font-semibold leading-tight text-slate-700">{d.name}</p>
          </button>
        ))}

        {clues.map((c, i) => (
          <button
            key={`clue-${i}`}
            type="button"
            onClick={() => setClue(c)}
            className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-1 py-4 text-center transition active:scale-[0.96]"
          >
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-300">
              ❓
            </span>
            <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-tight text-slate-400">
              {c.hint ?? "?????"}
            </p>
          </button>
        ))}

        {discovered.length === 0 && clues.length === 0 && (
          <div className="col-span-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
            <span className="text-3xl">🌱</span>
            <p className="mt-2 text-sm text-slate-400">继续你的旅程，神秘的发现正在等着你。</p>
          </div>
        )}
      </div>

      {item && <DiscoveredSheet item={item} onClose={() => setItem(null)} />}
      {clue && <ClueSheet clue={clue} onClose={() => setClue(null)} />}
    </section>
  );
}

function DiscoveredSheet({ item, onClose }: { item: DiscoveredItem; onClose: () => void }) {
  useEscClose(onClose);
  return (
    <Sheet onClose={onClose}>
      <div className="text-5xl">{item.icon}</div>
      <h3 className="mt-3 text-lg font-bold text-slate-900">{item.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
      <p className="mt-3 text-xs text-slate-400">🎁 已收入你的神秘成就</p>
      <CloseButton onClose={onClose} label="太棒了" />
    </Sheet>
  );
}

function ClueSheet({ clue, onClose }: { clue: DiscoveryClue; onClose: () => void }) {
  useEscClose(onClose);
  return (
    <Sheet onClose={onClose}>
      <div className="text-5xl opacity-70">🔍</div>
      <h3 className="mt-3 text-lg font-bold tracking-widest text-slate-400">?????</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        线索：{clue.hint ?? "尚未浮现"}
        <br />
        <span className="text-slate-400">剩下的条件，暂时保密。</span>
      </p>
      <CloseButton onClose={onClose} label="继续探索" />
    </Sheet>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 pb-8 text-center shadow-xl sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
    >
      {label}
    </button>
  );
}

function useEscClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}
