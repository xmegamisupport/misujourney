"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getWeeklyChallenge, type WeeklyChallenge, type Traveler } from "@/lib/leaderboard/engine";
import type { LeaderboardSectionDef } from "@/lib/leaderboard/registry";

/**
 * 🎯 Weekly Challenge — a GOAL, and above all a feeling: "someone's always been
 * keeping at it alongside me." So it points at action (CTA) and shows fellow
 * travelers — never a head-count. The traveler strip randomises each visit and
 * gently swaps one face every few seconds, so it always feels alive.
 */
export function WeeklyChallengeSection({ def }: { def: LeaderboardSectionDef }) {
  const [data, setData] = useState<WeeklyChallenge | null>(null);

  useEffect(() => {
    getWeeklyChallenge()
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const ch = data?.challenge ?? null;
  const dp = data?.dayProgress ?? { day: 0, total: 7 };
  const pct = dp.total > 0 ? Math.min(100, Math.round((dp.day / dp.total) * 100)) : 0;

  return (
    <section className="misu-rise">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-xl shadow-elev1">
          {ch?.icon ?? def.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-ink">{def.title}</h2>
            {data?.meCompleted && (
              <span className="shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-bold text-brand-deep">已完成 ✓</span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{def.description}</p>
        </div>
      </div>

      {data == null ? (
        <div className="flex justify-center rounded-card border border-line bg-surface py-8 shadow-elev1">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-tint border-t-brand" />
        </div>
      ) : ch == null ? (
        <div className="rounded-card border border-line bg-surface p-6 text-center text-sm text-ink-soft shadow-elev1">
          本周暂时没有挑战，下周见 🌱
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-elev1">
          <div className="bg-gradient-to-br from-brand-tint to-[#f0ece9] p-5">
            <p className="text-base font-bold text-ink">
              {ch.icon} {ch.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{ch.description}</p>

            {/* Day progress — the challenge's own timeline, not a head-count. */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
                <span className="text-ink-soft">本周进度</span>
                <span className="tabular-nums text-brand-deep">
                  Day {dp.day} / {dp.total}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-brand-deep transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Companionship — not numbers. */}
            <TogetherStrip travelers={data.travelers} />
          </div>

          <div className="p-4">
            {data.meCompleted ? (
              <div className="rounded-full bg-brand-tint py-2.5 text-center text-sm font-semibold text-brand-deep">
                🎉 你已完成本周挑战
              </div>
            ) : (
              <Link
                href="/customer"
                className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-brand-deep py-2.5 text-sm font-semibold text-white shadow-brand transition duration-500 ease-soft hover:-translate-y-0.5"
              >
                去完成今天的 Journey →
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** System travelers — used to keep the strip alive and varied while the real
 *  community is small (a product decision: the point is companionship, not an
 *  exact count). Real travelers are always mixed in first. */
const SYSTEM_TRAVELERS: Traveler[] = [
  { name: "Ashley", avatar: "🙂" },
  { name: "Bryan", avatar: "😊" },
  { name: "Michelle", avatar: "😄" },
  { name: "Jason", avatar: "😀" },
  { name: "Daniel", avatar: "😎" },
  { name: "Cheryl", avatar: "🤩" },
  { name: "Wei", avatar: "🥰" },
  { name: "Ivy", avatar: "😌" },
  { name: "Marcus", avatar: "🌟" },
  { name: "Sara", avatar: "😇" },
  { name: "Kenji", avatar: "🙌" },
  { name: "Nadia", avatar: "💪" },
];

const keyOf = (t: Traveler) => `${t.name}|${t.avatar}`;
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function TogetherStrip({ travelers }: { travelers: Traveler[] }) {
  // Real travelers first, then system ones — deduped.
  const pool = useMemo(() => {
    const seen = new Set<string>();
    const merged: Traveler[] = [];
    for (const t of [...travelers, ...SYSTEM_TRAVELERS]) {
      if (!seen.has(keyOf(t))) {
        seen.add(keyOf(t));
        merged.push(t);
      }
    }
    return merged;
  }, [travelers]);

  // 4–6 shown, chosen once per visit.
  const [display] = useState(() => 4 + Math.floor(Math.random() * 3));
  const [slots, setSlots] = useState<{ t: Traveler; nonce: number }[]>([]);

  // Re-pick the shown faces whenever the pool changes — adjusted DURING render
  // (React's supported "reset state on prop change" pattern), not in an effect.
  const poolSig = pool.map(keyOf).join("|");
  const [sig, setSig] = useState<string | null>(null);
  if (sig !== poolSig) {
    setSig(poolSig);
    setSlots(shuffle(pool).slice(0, Math.min(display, pool.length)).map((t) => ({ t, nonce: 0 })));
  }

  useEffect(() => {
    if (pool.length <= slots.length) return; // nothing new to rotate in
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setSlots((prev) => {
        if (prev.length === 0) return prev;
        const shown = new Set(prev.map((s) => keyOf(s.t)));
        const candidates = pool.filter((t) => !shown.has(keyOf(t)));
        if (candidates.length === 0) return prev;
        const i = Math.floor(Math.random() * prev.length);
        const r = candidates[Math.floor(Math.random() * candidates.length)]!;
        const next = [...prev];
        next[i] = { t: r, nonce: prev[i]!.nonce + 1 };
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [pool, slots.length]);

  if (slots.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2.5 text-xs font-semibold text-ink">🌱 一起坚持</p>
      <div className="flex flex-wrap gap-2">
        {slots.map((s, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-2.5 py-1 text-xs text-ink backdrop-blur-sm"
          >
            {/* only this inner span remounts on swap → gentle fade, no list movement */}
            <span key={s.nonce} className="together-fade inline-flex items-center gap-1.5">
              <span className="text-sm">{s.t.avatar}</span>
              {s.t.name}
            </span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes togetherFade { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: none; } }
        .together-fade { animation: togetherFade 600ms ease both; }
        @media (prefers-reduced-motion: reduce) { .together-fade { animation: none; } }
      `}</style>
    </div>
  );
}
