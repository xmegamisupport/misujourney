"use client";

import { useRef, useState } from "react";
import { acknowledgeReveals, ambientFor, type RevealItem } from "@/lib/discovery/reveal";

/**
 * A Reveal Session. One Discovery shows directly; several are swiped through
 * under a "✨ N Hidden Discoveries Found" header. One Continue ends the session,
 * acknowledges everything shown, and clears the queue. Emotion only — no
 * mechanics, no stats, no rarity.
 */
export function RevealSession({ items, onDone }: { items: RevealItem[]; onDone: () => void }) {
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const multi = items.length > 1;
  const current = items[Math.min(active, items.length - 1)];
  const ambient = ambientFor(current?.category ?? "", current?.code);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(Math.max(0, Math.min(items.length - 1, i)));
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    try {
      await acknowledgeReveals(items.map((i) => i.queueId));
    } catch {
      // swallow — the session still closes; the queue self-heals next visit
    }
    onDone();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
      style={{
        background: `radial-gradient(120% 90% at 50% 30%, ${ambient.from} 0%, ${ambient.to} 55%, rgba(15,23,42,0.86) 130%)`,
        transition: "background 700ms ease",
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* soft ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl hd-glow"
        style={{ background: ambient.glow, opacity: 0.5 }}
      />

      {multi && (
        <p className="hd-fade z-10 mb-6 text-center text-sm font-medium tracking-wide text-slate-600">
          ✨ 发现了 {items.length} 个新的时刻
        </p>
      )}

      {/* card track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="z-10 flex w-full max-w-md snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, i) => (
          <div key={item.queueId} className="w-full flex-none snap-center px-2">
            <div className="flex flex-col items-center text-center">
              <span
                key={`${item.queueId}-${active === i}`}
                className="hd-bloom mb-6 flex h-32 w-32 items-center justify-center rounded-full text-6xl"
                style={{ background: "rgba(255,255,255,0.65)", boxShadow: `0 20px 60px -20px ${ambient.ring}` }}
              >
                <span className="hd-float">{item.icon}</span>
              </span>
              <p className="hd-fade-1 mb-3 text-2xl font-bold text-slate-800">{item.name}</p>
              <p className="hd-fade-2 max-w-sm text-[15px] leading-relaxed text-slate-600">{item.message}</p>
            </div>
          </div>
        ))}
      </div>

      {multi && (
        <div className="z-10 mt-6 flex items-center gap-1.5">
          {items.map((it, i) => (
            <span
              key={it.queueId}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === active ? 18 : 6,
                background: i === active ? ambient.ring : "rgba(100,116,139,0.35)",
              }}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={finish}
        disabled={busy}
        className="z-10 mt-10 rounded-full bg-slate-900 px-10 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
      >
        {multi && active < items.length - 1 ? "继续查看" : "收下这份心意"}
      </button>
      {multi && active < items.length - 1 && (
        <p className="z-10 mt-3 text-xs text-slate-400">左右滑动，看看还发现了什么</p>
      )}

      <style>{`
        @keyframes hdBloom { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes hdFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes hdGlow { 0%,100% { transform: scale(1); opacity: 0.45; } 50% { transform: scale(1.15); opacity: 0.6; } }
        @keyframes hdFadeUp { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .hd-bloom { animation: hdBloom 900ms cubic-bezier(0.22,1,0.36,1) both; }
        .hd-float { display: inline-block; animation: hdFloat 4s ease-in-out infinite; }
        .hd-glow { animation: hdGlow 5s ease-in-out infinite; }
        .hd-fade { animation: hdFadeUp 700ms ease both; }
        .hd-fade-1 { animation: hdFadeUp 700ms ease both; animation-delay: 350ms; }
        .hd-fade-2 { animation: hdFadeUp 800ms ease both; animation-delay: 600ms; }
      `}</style>
    </div>
  );
}
