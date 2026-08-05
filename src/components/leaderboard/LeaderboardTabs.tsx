"use client";

import { useEffect, useState } from "react";
import { LEADERBOARD_SECTIONS } from "@/lib/leaderboard/registry";
import { getLeaderboard, type RankingBoard } from "@/lib/leaderboard/engine";
import { PodiumBoard } from "./PodiumBoard";
import { cn } from "@/lib/utils";

/** Recognition, not the goal. One podium board at a time in a tabbed container;
 *  switching a tab swaps the board in place. Tabs are DERIVED from the registry's
 *  ranking boards, so a future board becomes a tab automatically. */
const TABS = LEADERBOARD_SECTIONS.filter((d) => d.kind === "ranking");

export function LeaderboardTabs() {
  const [activeId, setActiveId] = useState(TABS[0]?.id ?? "");
  // Cache per tab so re-selecting a board doesn't re-run the entrance animation.
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
      <div className="flex gap-1 rounded-full border border-line bg-surface p-1 shadow-elev1">
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

      <p className="mb-1 mt-2.5 px-2 text-center text-xs leading-relaxed text-ink-soft">{def.description}</p>

      {/* keyed by tab so the podium re-mounts (and re-animates) on switch */}
      <PodiumBoard key={activeId} def={def} board={board} />
    </section>
  );
}
