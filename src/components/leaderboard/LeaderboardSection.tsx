"use client";

import { useEffect, useState } from "react";
import { getLeaderboard, type RankingBoard, type RankRow } from "@/lib/leaderboard/engine";
import type { LeaderboardSectionDef } from "@/lib/leaderboard/registry";
import { cn } from "@/lib/utils";

/** Each board gets its own icon-tile colour so it reads as a distinct
 *  "community event" rather than yet another identical list. */
const ACCENT_TILE: Record<string, string> = {
  gold: "bg-amber-tint",
  growth: "bg-brand-tint",
  star: "bg-brand-soft/40",
  challenge: "bg-brand-tint",
};

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/** A generic ranking board — self-fetching by its registry id. The same
 *  component renders every ranking type; the registry + RPC decide the rest. */
export function LeaderboardSection({ def }: { def: LeaderboardSectionDef }) {
  const [board, setBoard] = useState<RankingBoard | null>(null);

  useEffect(() => {
    getLeaderboard(def.id)
      .then(setBoard)
      .catch(() => setBoard({ me: null, rows: [] }));
  }, [def.id]);

  return (
    <section className="misu-rise">
      <div className="mb-3 flex items-start gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl shadow-elev1",
            ACCENT_TILE[def.accent],
          )}
        >
          {def.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-ink">{def.title}</h2>
            {board?.me && (
              <span className="shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-bold text-brand-deep">
                我 · 第 {board.me.rank} 名
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{def.description}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-elev1">
        {board == null ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-tint border-t-brand" />
          </div>
        ) : board.rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm leading-relaxed text-ink-soft">
            {emptyMessage(def)}
          </p>
        ) : (
          board.rows.map((r) => <Row key={`${r.rank}-${r.name}`} row={r} def={def} />)
        )}
      </div>
    </section>
  );
}

function Row({ row, def }: { row: RankRow; def: LeaderboardSectionDef }) {
  const medal = MEDAL[row.rank];
  const sign = def.signed && row.value > 0 ? "+" : "";
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0",
        row.isMe && "bg-brand-tint/60",
      )}
    >
      <span className="flex w-7 shrink-0 items-center justify-center text-sm font-bold tabular-nums text-ink-faint">
        {medal ?? row.rank}
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-lg">{row.avatar}</span>
      <p className={cn("min-w-0 flex-1 truncate text-sm font-medium", row.isMe ? "text-brand-deep" : "text-ink")}>
        {row.name}
        {row.isMe && <span className="ml-1.5 text-[11px] font-semibold text-brand">· 我</span>}
      </p>
      <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
        {sign}
        {row.value.toLocaleString()}
        {def.unit && <span className="ml-0.5 text-[11px] font-medium text-ink-faint">{def.unit}</span>}
      </span>
    </div>
  );
}

function emptyMessage(def: LeaderboardSectionDef): string {
  switch (def.id) {
    case "weekly_growth":
      return "这一周还没有人上榜。多完成几天，比上周更进一步，第一个突破的可以是你。";
    case "rising_star":
      return "还没有新星上榜。完成今天的 Journey，点亮你的第一颗星。";
    default:
      return "这一周还没有人上榜。完成今天的 Journey，第一个名字，可以是你。";
  }
}
