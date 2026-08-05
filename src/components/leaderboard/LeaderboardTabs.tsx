"use client";

import { useEffect, useState } from "react";
import { LEADERBOARD_SECTIONS } from "@/lib/leaderboard/registry";
import { getLeaderboard, type RankingBoard } from "@/lib/leaderboard/engine";
import { PodiumBoard } from "./PodiumBoard";
import { cn } from "@/lib/utils";

/** Recognition, not the goal. One podium board at a time; the tab bar is DERIVED
 *  from the registry's ranking boards, so a future board becomes a tab for free.
 *  Under the tabs, a grey one-line caption tells the user what the board ranks.
 *  Active tab is always MISU brand pink (unified brand color across boards). */
const TABS = LEADERBOARD_SECTIONS.filter((d) => d.kind === "ranking");

export function LeaderboardTabs() {
  const [activeId, setActiveId] = useState(TABS[0]?.id ?? "");
  // Cache per tab so re-selecting a board doesn't refetch or re-flash.
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
      <div className="flex gap-1.5 rounded-full border border-white/70 bg-glass p-1 shadow-elev1 backdrop-blur-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-medium transition duration-300 ease-soft",
              t.id === activeId ? "lb-tab-on font-semibold text-white" : "text-ink-soft",
            )}
          >
            <span>{t.icon}</span>
            {t.short ?? t.title}
          </button>
        ))}
      </div>

      {(def.caption ?? def.description) && (
        <p className="mb-1 mt-2.5 px-2 text-center text-[11.5px] leading-relaxed text-ink-faint">
          {def.caption ?? def.description}
        </p>
      )}

      {/* keyed by tab so the podium re-mounts (and re-animates) on switch */}
      <PodiumBoard key={activeId} def={def} board={board} />

      <style>{`
        .lb-tab-on{
          background:linear-gradient(160deg,#f5789f,#ee4d81);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 3px rgba(192,52,95,.28), 0 8px 18px -9px #ee4d81;
        }
      `}</style>
    </section>
  );
}
