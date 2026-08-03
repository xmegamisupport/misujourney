"use client";

import { useEffect, useState } from "react";
import { LEADERBOARD_SECTIONS, type LeaderboardSectionDef } from "@/lib/leaderboard/registry";
import { getLeaderboard, type RankingBoard, type RankRow } from "@/lib/leaderboard/engine";
import { cn } from "@/lib/utils";

/** Recognition, not the goal. One ranking board at a time in a tabbed container;
 *  switching a tab swaps the content in place. Tabs are DERIVED from the
 *  registry's ranking boards, so a future board becomes a tab automatically —
 *  no change here. */
const TABS = LEADERBOARD_SECTIONS.filter((d) => d.kind === "ranking");

const ACCENT_TILE: Record<string, string> = {
  gold: "bg-amber-tint",
  growth: "bg-brand-tint",
  star: "bg-brand-soft/40",
  challenge: "bg-brand-tint",
};
const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LeaderboardTabs() {
  const [activeId, setActiveId] = useState(TABS[0]?.id ?? "");
  // Cache per tab so re-selecting a board doesn't re-flash a spinner.
  const [boards, setBoards] = useState<Record<string, RankingBoard>>({});
  const def = TABS.find((t) => t.id === activeId) ?? TABS[0];
  const board = boards[activeId];

  useEffect(() => {
    if (!activeId || board) return;
    let cancelled = false;
    getLeaderboard(activeId)
      .then((b) => !cancelled && setBoards((m) => ({ ...m, [activeId]: b })))
      .catch(() => !cancelled && setBoards((m) => ({ ...m, [activeId]: { me: null, rows: [] } })));
    return () => {
      cancelled = true;
    };
  }, [activeId, board]);

  if (!def) return null;

  return (
    <section className="misu-rise">
      {/* Tab bar */}
      <div className="mb-3 flex gap-1 rounded-full border border-line bg-surface p-1 shadow-elev1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-semibold transition duration-500 ease-soft",
              t.id === activeId ? "bg-gradient-to-br from-brand to-brand-deep text-white shadow-brand" : "text-ink-soft",
            )}
          >
            <span>{t.icon}</span>
            {t.short ?? t.title}
          </button>
        ))}
      </div>

      {/* Active board — swaps in place */}
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-elev1">
        <div className="flex items-start gap-3 border-b border-line-soft p-4">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg shadow-elev1",
              ACCENT_TILE[def.accent],
            )}
          >
            {def.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink">{def.title}</h2>
              {board?.me && (
                <span className="shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-bold text-brand-deep">
                  我 · 第 {board.me.rank} 名
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{def.description}</p>
          </div>
        </div>

        {board === undefined ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-tint border-t-brand" />
          </div>
        ) : board.rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm leading-relaxed text-ink-soft">{emptyMessage(def)}</p>
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
