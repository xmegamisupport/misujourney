"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneyPoints } from "@/lib/journey-points/hooks";
import { getJourneyLeaderboard, type Leaderboard, type LeaderboardRow } from "@/lib/leaderboard/engine";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";

/**
 * 🏆 Leaderboard — COMMUNITY motivation, deliberately separate from personal
 * progress. "My Progress" is me vs my past; the Leaderboard is "our journey" —
 * how I'm doing alongside everyone else. Names + points are public here by
 * product decision; the server exposes only name + avatar + points (no ids,
 * emails, phones, or weight). This page is the home for every future
 * competitive / community feature.
 */
export default function LeaderboardPage() {
  const { user } = useAuthUser();
  const { balance } = useJourneyPoints(user?.id ?? "");
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [tab, setTab] = useState<"total" | "weekly">("total");

  useEffect(() => {
    if (!user?.id) return;
    getJourneyLeaderboard().then(setBoard).catch(() => setBoard({ me: null, topTotal: [], topWeekly: [] }));
  }, [user?.id]);

  const myTotal = board?.me?.total ?? balance?.total ?? 0;
  const myRank = board?.me?.totalRank ?? null;
  const rows = tab === "total" ? (board?.topTotal ?? []) : (board?.topWeekly ?? []);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 pb-28 pt-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(90%_100%_at_20%_0%,#fce9ef_0%,transparent_72%)]"
      />

      <div className="relative flex flex-col gap-5">
        <header className="misu-rise pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-deep">Leaderboard</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">排行榜</h1>
          <p className="mt-0.5 text-xs text-ink-soft">我们的旅程 —— 一起走，比一个人走更有劲。</p>
        </header>

        {/* My standing — real points + real rank in the community. */}
        <section
          className="misu-rise relative overflow-hidden rounded-card border border-white/70 bg-gradient-to-br from-brand-tint via-white to-[#f0ece9] p-5 shadow-elev2"
          style={{ animationDelay: "60ms" }}
        >
          <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-brand-soft/40 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <Chip icon="🏅" tone="brand">我的积分</Chip>
              <p className="mt-3 text-4xl font-extrabold tabular-nums text-ink">
                {myTotal.toLocaleString()}
                <span className="ml-1.5 text-sm font-semibold text-ink-faint">pts</span>
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {balance?.today ? `今天 +${balance.today} · ` : ""}继续完成每日 Journey，积分会一直累积。
              </p>
            </div>
            <div className="shrink-0 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-3xl shadow-elev1">🏆</div>
              <p className="mt-2 text-[10px] font-medium text-ink-faint">社群排名</p>
              <p className="text-sm font-bold text-brand-deep">{myRank ? `第 ${myRank} 名` : "未上榜"}</p>
            </div>
          </div>
        </section>

        {/* Weekly Challenge — a shared goal for everyone, each week. */}
        <section className="misu-rise" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
            本周挑战 <Chip icon="🎯">即将开放</Chip>
          </h2>
          <div className="rounded-card border border-line bg-surface p-5 shadow-elev1">
            <p className="text-sm font-semibold text-ink">和大家一起，完成本周的小目标</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              每周一个共同的挑战 —— 比如「7 天都完成饮水」。达成的人会一起出现在这里，
              让坚持不再是一个人的事。
            </p>
          </div>
        </section>

        {/* The community board — real ranking by Journey Points. */}
        <section className="misu-rise" style={{ animationDelay: "180ms" }}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold text-ink">排行榜</h2>
            <div className="flex rounded-full border border-line bg-surface p-0.5 shadow-elev1">
              <TabButton active={tab === "total"} onClick={() => setTab("total")}>总榜</TabButton>
              <TabButton active={tab === "weekly"} onClick={() => setTab("weekly")}>本周</TabButton>
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-elev1">
            {board == null ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-tint border-t-brand" />
              </div>
            ) : rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm leading-relaxed text-ink-soft">
                {tab === "weekly" ? "这一周还没有人上榜。" : "还没有人上榜。"}
                <br />
                完成今天的 Journey，第一个名字，可以是你。
              </p>
            ) : (
              rows.map((r) => <RankRow key={`${r.rank}-${r.name}`} row={r} />)
            )}
          </div>
          <p className="mt-2 px-1 text-xs leading-relaxed text-ink-faint">
            {tab === "weekly" ? "只看这一周 —— 每周一重新开始，人人都有机会。" : "按累计积分，看看整个社群一路的坚持。"}
          </p>
        </section>

        <p className="misu-rise px-2 pt-1 text-center text-xs leading-relaxed text-ink-faint" style={{ animationDelay: "220ms" }}>
          排行榜是「我们」——和大家一起。想看自己的成长轨迹，在
          <span className="font-medium text-ink-soft"> 我的 → 我的进展</span>。
        </p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1 text-xs font-semibold transition duration-500 ease-soft",
        active ? "bg-gradient-to-br from-brand to-brand-deep text-white shadow-brand" : "text-ink-soft",
      )}
    >
      {children}
    </button>
  );
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function RankRow({ row }: { row: LeaderboardRow }) {
  const medal = MEDAL[row.rank];
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0",
        row.isMe && "bg-brand-tint/60",
      )}
    >
      <span className="flex w-7 shrink-0 items-center justify-center text-sm font-bold tabular-nums text-ink-faint">
        {medal ?? row.rank}
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-lg">
        {row.avatar}
      </span>
      <p className={cn("min-w-0 flex-1 truncate text-sm font-medium", row.isMe ? "text-brand-deep" : "text-ink")}>
        {row.name}
        {row.isMe && <span className="ml-1.5 text-[11px] font-semibold text-brand">· 我</span>}
      </p>
      <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
        {row.points.toLocaleString()}
        <span className="ml-0.5 text-[11px] font-medium text-ink-faint">pts</span>
      </span>
    </div>
  );
}
