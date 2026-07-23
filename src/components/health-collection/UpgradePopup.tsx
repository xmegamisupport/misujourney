"use client";

import type { BadgeUpgrade } from "@/lib/health-collection/types";
import { BadgeRing } from "./BadgeRing";

/** Full celebration when a habit reaches a new stage. Elegant, not arcade:
 * a soft burst of the stage colour, the habit scaling in, and a reward to keep
 * going — with the option to share the moment. */
export function UpgradePopup({ upgrade, onDismiss }: { upgrade: BadgeUpgrade; onDismiss: () => void }) {
  const { level } = upgrade;

  async function share() {
    const text = `我在 MISU Journey 养成了「${upgrade.title}」的好习惯，刚刚成长到 ${level.name} ✨ #GlowingYou`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* user cancelled or unsupported — nothing to do */
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <style>{`
        @keyframes hcPop { 0% { transform: scale(.7); opacity: 0 } 60% { transform: scale(1.06) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes hcGlow { 0% { transform: scale(.6); opacity: 0 } 40% { opacity: .55 } 100% { transform: scale(1.5); opacity: 0 } }
        @media (prefers-reduced-motion: reduce){ .hc-anim { animation: none !important } }
      `}</style>
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative flex w-full max-w-xs flex-col items-center rounded-3xl bg-white px-6 py-8 text-center shadow-2xl">
        <p className="text-3xl">🎉</p>
        <p className="mt-1 text-base font-bold text-slate-900">恭喜！</p>

        <div className="relative mt-4 flex items-center justify-center">
          <span className="hc-anim absolute h-32 w-32 rounded-full" style={{ background: level.color, animation: "hcGlow 1.1s ease-out forwards" }} />
          <span className="hc-anim block" style={{ animation: "hcPop .5s ease-out forwards" }}>
            <BadgeRing percent={1} color={level.color} icon={upgrade.icon} size={116} stroke={9} />
          </span>
        </div>

        <p className="mt-4 text-sm text-slate-500">你的 {upgrade.title} 成长到</p>
        <p className="mt-1 text-2xl font-extrabold" style={{ color: level.color }}>
          {level.name}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          健康的习惯，在每天的重复里，慢慢变得强大。
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-2xl py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
          style={{ backgroundColor: level.color }}
        >
          继续保持
        </button>
        <button
          type="button"
          onClick={share}
          className="mt-2 w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.99]"
        >
          分享我的进步
        </button>
      </div>
    </div>
  );
}
