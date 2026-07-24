"use client";

import { useEffect, useState } from "react";
import { SECRET_ACHIEVEMENTS } from "@/lib/health-collection/config";
import type { SecretAchievement } from "@/lib/health-collection/types";

/**
 * Secret Achievements — the discovery layer. Always visible as mysteries so the
 * page never feels finished. The overview only teases; tapping reveals a small
 * hint (or the real achievement, once unlocked) — never the full conditions.
 */
export function SecretSection() {
  const [selected, setSelected] = useState<SecretAchievement | null>(null);

  return (
    <section className="mt-8">
      <div className="mb-0.5 flex items-baseline gap-2">
        <h2 className="text-base font-bold text-slate-800">🎁 神秘成就</h2>
      </div>
      <p className="mb-3 text-[11px] text-slate-400">有些成长，不会提前揭晓。</p>

      <div className="grid grid-cols-3 gap-2.5">
        {SECRET_ACHIEVEMENTS.map((s) => (
          <SecretCard key={s.id} secret={s} onClick={() => setSelected(s)} />
        ))}
      </div>

      {selected && <SecretSheet secret={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function SecretCard({ secret, onClick }: { secret: SecretAchievement; onClick: () => void }) {
  const unlocked = secret.status === "unlocked";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center rounded-2xl border px-1 py-4 text-center transition active:scale-[0.96] ${
        unlocked ? "border-emerald-100 bg-white" : "border-dashed border-slate-200 bg-slate-50/60"
      }`}
    >
      <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-full text-2xl ${unlocked ? "" : "bg-slate-100 text-slate-300"}`}>
        {unlocked ? secret.icon ?? "🎁" : "❓"}
      </span>
      <p className={`mt-2 text-[12px] font-semibold leading-tight ${unlocked ? "text-slate-700" : "tracking-widest text-slate-300"}`}>
        {unlocked ? secret.title ?? "" : "?????"}
      </p>
    </button>
  );
}

function SecretSheet({ secret, onClose }: { secret: SecretAchievement; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const unlocked = secret.status === "unlocked";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 pb-8 text-center shadow-xl sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        {unlocked ? (
          <>
            <div className="text-5xl">{secret.icon ?? "🎁"}</div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{secret.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{secret.description}</p>
          </>
        ) : (
          <>
            <div className="text-5xl opacity-70">{secret.status === "hint" ? "🔍" : "🔒"}</div>
            <h3 className="mt-3 text-lg font-bold tracking-widest text-slate-400">?????</h3>
            {secret.status === "hint" ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                线索：{secret.hint}
                <br />
                <span className="text-slate-400">剩下的条件，暂时保密。</span>
              </p>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                这个成就，还没有揭晓自己。
                <br />
                <span className="text-slate-400">继续你的旅程，也许某天它会出现。</span>
              </p>
            )}
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
        >
          {unlocked ? "太棒了" : "继续探索"}
        </button>
      </div>
    </div>
  );
}
