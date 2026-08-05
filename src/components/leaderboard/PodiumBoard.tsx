"use client";

import type { RankingBoard, RankRow, MyStanding, Trend } from "@/lib/leaderboard/engine";
import type { LeaderboardSectionDef } from "@/lib/leaderboard/registry";
import { cn } from "@/lib/utils";

/**
 * A leaderboard board rendered as a PODIUM, not a list. The whole point: open it
 * and instantly see the champion, then want to climb. Top 3 stand on tiered
 * pedestals (2nd < 1st > 3rd) under premium glass/metal crowns; ranks 4–10 are a
 * clean list; and when you're not in the top 3, a fixed card shows your rank +
 * the gap to Top 10 so the climb feels one push away. Premium · clean · soft
 * glass — Apple Awards, not a livestream.
 */
export function PodiumBoard({ def, board }: { def: LeaderboardSectionDef; board: RankingBoard | undefined }) {
  if (board === undefined) {
    return (
      <div className="flex items-center justify-center rounded-card border border-line bg-surface py-14 shadow-elev1">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-tint border-t-brand" />
      </div>
    );
  }
  if (board.rows.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface px-5 py-12 text-center text-sm leading-relaxed text-ink-soft shadow-elev1">
        {emptyMessage(def)}
      </div>
    );
  }

  const top3 = board.rows.slice(0, 3);
  const rest = board.rows.slice(3);

  return (
    <div className="flex flex-col gap-4">
      {board.me && board.me.rank > 3 && <MyRankCard me={board.me} def={def} />}

      {/* Hero podium — 2nd · 1st(center, tallest) · 3rd */}
      <div className="grid grid-cols-3 items-end gap-2 pt-7">
        <PodiumCol row={top3[1]} place={2} def={def} />
        <PodiumCol row={top3[0]} place={1} def={def} />
        <PodiumCol row={top3[2]} place={3} def={def} />
      </div>

      {rest.length > 0 && (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-elev1">
          {rest.map((r) => (
            <ListRow key={`${r.rank}-${r.name}`} row={r} def={def} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes podiumIn { from { opacity: 0; transform: translateY(10px) scale(.92); } to { opacity: 1; transform: none; } }
        .podium-col { animation: podiumIn 450ms cubic-bezier(.32,.72,0,1) both; }
        @media (prefers-reduced-motion: reduce) { .podium-col { animation: none; } }
      `}</style>
    </div>
  );
}

/* ── Crown — premium glass/metal, per place. Not a cartoon 👑. ─────────────── */
const CROWN_STOPS: Record<number, [string, string, string]> = {
  1: ["#F9E4A0", "#E7B94F", "#BB8A34"], // gold
  2: ["#F1F3F6", "#CBD0D7", "#A0A5AF"], // silver
  3: ["#F5C7AB", "#DC9472", "#B26A4C"], // bronze / rose-copper
};

function Crown({ place, size }: { place: number; size: number }) {
  const [a, b, c] = CROWN_STOPS[place] ?? CROWN_STOPS[1]!;
  const gid = `cr-${place}`;
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 40 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="20" y1="4" x2="20" y2="31" gradientUnits="userSpaceOnUse">
          <stop stopColor={a} />
          <stop offset="0.5" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <linearGradient id={`${gid}-s`} x1="6" y1="5" x2="30" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M5 25 L3 9 L13 17 L20 5 L27 17 L37 9 L35 25 Z M5 25 h30 v3.4 a2 2 0 0 1 -2 2 h-26 a2 2 0 0 1 -2 -2 Z"
        fill={`url(#${gid})`}
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path d="M5 25 L3 9 L13 17 L20 5 L27 17 L37 9 L35 25 Z" fill={`url(#${gid}-s)`} />
    </svg>
  );
}

const RING: Record<number, string> = {
  1: "ring-[3px] ring-[#E7B94F]/70",
  2: "ring-2 ring-[#C9CDD4]",
  3: "ring-2 ring-[#DC9472]/80",
};
const NUM_COLOR: Record<number, string> = { 1: "text-[#C79A3D]", 2: "text-[#A6ABB4]", 3: "text-[#B87352]" };

function PodiumCol({ row, place, def }: { row: RankRow | undefined; place: number; def: LeaderboardSectionDef }) {
  const delay = place === 1 ? "0ms" : place === 2 ? "100ms" : "200ms";
  if (!row) return <div className="podium-col" style={{ animationDelay: delay }} />;
  const avatar = place === 1 ? 64 : 52;
  const pedH = place === 1 ? "h-24" : place === 2 ? "h-16" : "h-[3.25rem]";
  return (
    <div className="podium-col flex min-w-0 flex-col items-center" style={{ animationDelay: delay }}>
      <Crown place={place} size={place === 1 ? 40 : 30} />
      <div
        className={cn("-mt-2 flex items-center justify-center rounded-full bg-canvas shadow-elev1", RING[place])}
        style={{ width: avatar, height: avatar, fontSize: avatar * 0.5 }}
      >
        {row.avatar}
      </div>
      <p className={cn("mt-2 max-w-[6.5rem] truncate text-center text-xs font-bold", row.isMe ? "text-brand-deep" : "text-ink")}>
        {row.name}
        {row.isMe && "（我）"}
      </p>
      <p className="text-[11px] font-semibold tabular-nums text-ink-soft">{formatValue(row.value, def)} pts</p>
      <div
        className={cn(
          "mt-2 flex w-full items-start justify-center rounded-t-2xl border border-b-0 border-line bg-gradient-to-b from-white to-[#f1ede9] pt-2 shadow-elev1",
          pedH,
        )}
      >
        <span className={cn("text-2xl font-black", NUM_COLOR[place])}>{place}</span>
      </div>
    </div>
  );
}

function ListRow({ row, def }: { row: RankRow; def: LeaderboardSectionDef }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0",
        row.isMe && "bg-brand-tint/60",
      )}
    >
      <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-ink-faint">{row.rank}</span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-base">{row.avatar}</span>
      <p className={cn("min-w-0 flex-1 truncate text-sm font-medium", row.isMe ? "text-brand-deep" : "text-ink")}>
        {row.name}
        {row.isMe && "（我）"}
      </p>
      <TrendBadge trend={row.trend} />
      <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums text-ink">
        {formatValue(row.value, def)}
        <span className="ml-0.5 text-[10px] font-medium text-ink-faint">{def.unit}</span>
      </span>
    </div>
  );
}

function MyRankCard({ me, def }: { me: MyStanding; def: LeaderboardSectionDef }) {
  const inTop10 = me.toTop10 <= 0;
  const pct = inTop10 ? 100 : Math.max(6, Math.round((me.value / (me.value + me.toTop10)) * 100));
  return (
    <div className="rounded-card border border-brand-soft/40 bg-gradient-to-br from-brand-tint to-white p-4 shadow-elev1">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-ink-soft">你的本周排名</p>
          <p className="mt-0.5 flex items-center gap-2 text-2xl font-extrabold tabular-nums text-ink">
            #{me.rank}
            <TrendBadge trend={me.trend} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-ink-soft">距离 Top 10</p>
          <p className="text-sm font-bold text-brand-deep">{inTop10 ? "已进入 🎉" : `还差 ${me.toTop10.toLocaleString()} ${def.unit ?? "pts"}`}</p>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/70">
        <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-deep transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-soft">{inTop10 ? "你已经在第一页啦，继续保持。" : "再努力一点，就能冲进第一页。"}</p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: Trend }) {
  if (trend.dir === "new") {
    return <span className="rounded-full bg-brand-tint px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-deep">NEW</span>;
  }
  if (trend.dir === "same") {
    return <span className="text-[11px] font-semibold text-ink-faint">保持</span>;
  }
  const up = trend.dir === "up";
  return (
    <span className={cn("text-[11px] font-bold tabular-nums", up ? "text-emerald-600" : "text-rose-500")}>
      {up ? "▲" : "▼"} {trend.delta}
    </span>
  );
}

function formatValue(v: number, def: LeaderboardSectionDef): string {
  return `${def.signed && v > 0 ? "+" : ""}${v.toLocaleString()}`;
}

function emptyMessage(def: LeaderboardSectionDef): string {
  switch (def.id) {
    case "weekly_growth":
      return "这一周还没有人上榜。多完成几天，比上周更进一步，第一个突破的可以是你。";
    case "rising_star":
      return "还没有新星上榜。完成今天的 Journey，点亮你的第一颗星。";
    default:
      return "这一周还没有人上榜。完成今天的 Journey，第一个站上领奖台的，可以是你。";
  }
}
