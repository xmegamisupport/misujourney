"use client";

import type { RevealedDiscovery } from "@/lib/discovery/types";

/**
 * The moment a hidden discovery reveals itself. Shown one at a time (the engine
 * drips them), it should feel like unwrapping a small, unexpected gift — calm
 * and warm, never arcade.
 */
export function DiscoveryReveal({
  discovery,
  onClose,
}: {
  discovery: RevealedDiscovery;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <style>{`
        @keyframes dvPop { 0% { transform: scale(.6) rotate(-6deg); opacity: 0 } 60% { transform: scale(1.08) rotate(2deg) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes dvGlow { 0% { transform: scale(.5); opacity: 0 } 45% { opacity: .5 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes dvFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @media (prefers-reduced-motion: reduce){ .dv-anim { animation: none !important } }
      `}</style>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-full max-w-xs flex-col items-center rounded-3xl bg-gradient-to-b from-white to-rose-50/60 px-6 py-9 text-center shadow-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-400">✨ New Discovery</p>

        <div className="relative mt-5 flex items-center justify-center">
          <span className="dv-anim absolute h-28 w-28 rounded-full bg-rose-200/60" style={{ animation: "dvGlow 1.2s ease-out forwards" }} />
          <span
            className="dv-anim flex h-24 w-24 items-center justify-center rounded-full bg-white text-5xl shadow-[0_10px_30px_-8px_rgba(244,114,182,0.5)]"
            style={{ animation: "dvPop .6s ease-out forwards" }}
          >
            {discovery.icon}
          </span>
        </div>

        <h2 className="dv-anim mt-5 text-xl font-bold text-slate-900" style={{ animation: "dvFloat 3s ease-in-out .6s infinite" }}>
          {discovery.name}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{discovery.description}</p>
        <p className="mt-3 text-xs text-slate-400">已加入你的神秘成就 🎁</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
        >
          收下这份惊喜
        </button>
      </div>
    </div>
  );
}
