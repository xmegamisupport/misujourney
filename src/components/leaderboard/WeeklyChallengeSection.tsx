"use client";

import { useEffect, useState } from "react";
import { getWeeklyChallenge, type WeeklyChallenge } from "@/lib/leaderboard/engine";
import type { LeaderboardSectionDef } from "@/lib/leaderboard/registry";
import { cn } from "@/lib/utils";

/**
 * 🎯 Weekly Challenge — deliberately NOT a ranking list. It's a shared community
 * goal, so the emphasis is participation (progress + who joined + who finished),
 * not competition. Structurally distinct from the ranking boards on purpose.
 */
export function WeeklyChallengeSection({ def }: { def: LeaderboardSectionDef }) {
  const [data, setData] = useState<WeeklyChallenge | null>(null);

  useEffect(() => {
    getWeeklyChallenge()
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const ch = data?.challenge ?? null;
  const participants = data?.participants ?? 0;
  const completions = data?.completions ?? 0;
  const pct = participants > 0 ? Math.min(100, Math.round((completions / participants) * 100)) : 0;

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

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
                <span className="text-ink-soft">社群完成进度</span>
                <span className="tabular-nums text-brand-deep">
                  {completions} / {participants} 人
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-brand-deep transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat value={participants} label="参与人数" />
              <Stat value={completions} label="完成人数" />
            </div>
          </div>

          <div className="p-4">
            <p className="mb-2 text-xs font-semibold text-ink">🎉 已完成的旅人</p>
            {data.completers.length === 0 ? (
              <p className="py-2 text-center text-xs text-ink-soft">还没有人完成 —— 成为第一个吧。</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.completers.map((c, i) => (
                  <span
                    key={`${c.name}-${i}`}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                      c.isMe ? "border-brand-soft bg-brand-tint font-semibold text-brand-deep" : "border-line bg-canvas text-ink-soft",
                    )}
                  >
                    <span>{c.avatar}</span>
                    {c.name}
                    {c.isMe && " · 我"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-white/60 bg-surface/70 px-3 py-2.5 text-center backdrop-blur-sm">
      <p className="text-xl font-extrabold tabular-nums text-ink">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[10px] text-ink-soft">{label}</p>
    </div>
  );
}
