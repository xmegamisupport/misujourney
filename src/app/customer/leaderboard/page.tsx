"use client";

import { LEADERBOARD_SECTIONS } from "@/lib/leaderboard/registry";
import { LeaderboardSection } from "@/components/leaderboard/LeaderboardSection";
import { WeeklyChallengeSection } from "@/components/leaderboard/WeeklyChallengeSection";

/**
 * 🏆 Leaderboard — COMMUNITY motivation, separate from personal progress
 * (我的 → 我的进展). "Our journey": how I'm doing alongside everyone else, with a
 * reason to come back every week.
 *
 * The page is intentionally dumb: it renders whatever the registry declares.
 * Ranking boards use one generic component; the weekly challenge uses its own
 * participation-shaped component. Adding a future board (monthly, habit,
 * coach-team, special event…) is a registry entry (+ an RPC case) — this file
 * never changes.
 */
export default function LeaderboardPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 pb-28 pt-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(90%_100%_at_20%_0%,#fce9ef_0%,transparent_72%)]"
      />

      <div className="relative flex flex-col gap-6">
        <header className="misu-rise pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-deep">Leaderboard</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">排行榜</h1>
          <p className="mt-0.5 text-xs text-ink-soft">我们的旅程 —— 每周，和大家一起，再往前一点。</p>
        </header>

        {LEADERBOARD_SECTIONS.map((def) =>
          def.kind === "challenge" ? (
            <WeeklyChallengeSection key={def.id} def={def} />
          ) : (
            <LeaderboardSection key={def.id} def={def} />
          ),
        )}

        <p className="misu-rise px-2 text-center text-xs leading-relaxed text-ink-faint">
          排行榜是「我们」——和大家一起。想看自己的成长轨迹，在
          <span className="font-medium text-ink-soft"> 我的 → 我的进展</span>。
        </p>
      </div>
    </div>
  );
}
