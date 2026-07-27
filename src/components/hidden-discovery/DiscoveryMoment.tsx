"use client";

import { ambientFor, type CollectionItem } from "@/lib/discovery/reveal";

/**
 * A single Discovery, viewed up close — like standing before one piece in a
 * gallery. Calm, immersive, unhurried: the whole point is to reread the message
 * and remember. Not a modal of data; a quiet moment.
 */
export function DiscoveryMoment({ item, onClose }: { item: CollectionItem; onClose: () => void }) {
  const a = ambientFor(item.category, item.code);
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8"
      style={{ background: `radial-gradient(120% 90% at 50% 28%, ${a.from} 0%, ${a.to} 55%, rgba(15,23,42,0.9) 130%)` }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[30%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl dm-glow"
        style={{ background: a.glow, opacity: 0.5 }}
      />

      <div className="z-10 flex flex-col items-center text-center">
        <span
          className="dm-in mb-7 flex h-28 w-28 items-center justify-center rounded-full text-6xl"
          style={{ background: "rgba(255,255,255,0.68)", boxShadow: `0 22px 60px -20px ${a.ring}` }}
        >
          <span className="dm-float">{item.icon}</span>
        </span>
        <p className="dm-in mb-4 text-2xl font-bold text-slate-800">{item.name}</p>
        <p className="dm-in max-w-sm font-serif text-[16px] leading-loose text-slate-600">{item.message}</p>
        <p className="dm-in mt-6 text-xs tracking-widest text-slate-400">发现于 {item.discoveredAt?.slice(0, 10)}</p>
      </div>

      <p className="z-10 mt-14 text-xs text-slate-400">轻触任意处，收起</p>

      <style>{`
        @keyframes dmIn { 0% { transform: translateY(8px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes dmFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes dmGlow { 0%,100% { transform: scale(1); opacity: 0.45; } 50% { transform: scale(1.12); opacity: 0.6; } }
        .dm-in { animation: dmIn 700ms ease both; }
        .dm-in:nth-of-type(2) { animation-delay: 120ms; }
        .dm-float { display: inline-block; animation: dmFloat 4.5s ease-in-out infinite; }
        .dm-glow { animation: dmGlow 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
