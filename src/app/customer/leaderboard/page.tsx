"use client";

import { LEADERBOARD_SECTIONS } from "@/lib/leaderboard/registry";
import { WeeklyChallengeSection } from "@/components/leaderboard/WeeklyChallengeSection";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";

/**
 * 🏆 Leaderboard — COMMUNITY motivation, separate from personal progress
 * (我的 → 我的进展). Information hierarchy is deliberate:
 *   1. GOAL first — the Weekly Challenge is always visible at the top. It tells
 *      the user "what should I do this week?" and points at action.
 *   2. RECOGNITION second — the ranking boards, in a single TABBED container
 *      (one board at a time), so the page never becomes a long scroll of lists.
 * Boards are registry-driven; tabs derive from it (see LeaderboardTabs).
 */
const CHALLENGE = LEADERBOARD_SECTIONS.find((d) => d.kind === "challenge");

export default function LeaderboardPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 pb-28 pt-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(90%_100%_at_20%_0%,#fce9ef_0%,transparent_72%)]"
      />

      <div className="relative flex flex-col gap-6 pt-1">
        {/* 1 · GOAL — always visible, points at action */}
        {CHALLENGE && <WeeklyChallengeSection def={CHALLENGE} />}

        <div className="misu-rise flex items-center gap-3 px-1">
          <span className="h-px flex-1 bg-line-soft" />
          <span className="shrink-0 text-[11px] font-medium tracking-wide text-ink-faint">榜单 · 看看大家</span>
          <span className="h-px flex-1 bg-line-soft" />
        </div>

        {/* 2 · RECOGNITION — one board at a time, tabbed (leads straight into the boards) */}
        <LeaderboardTabs />

        <p className="misu-rise px-2 text-center text-xs leading-relaxed text-ink-faint">
          排行榜是「我们」——和大家一起。想看自己的成长轨迹，在
          <span className="font-medium text-ink-soft"> 我的 → 我的进展</span>。
        </p>
      </div>
    </div>
  );
}
