"use client";

import type { RankingBoard, RankRow } from "@/lib/leaderboard/engine";
import type { LeaderboardSectionDef } from "@/lib/leaderboard/registry";
import { Avatar } from "@/components/ui/Avatar";

/**
 * A ranking board rendered as a PODIUM — recognition, not a data table.
 * Layout & polish match the approved MISU design (Pink Luxury / Wellness):
 *   • champion center + tallest (Hero), 2nd left / 3rd right, tiered pillars
 *   • gold / silver / bronze live ONLY in the crown + avatar ring — every pillar
 *     is the same pink family so the board reads as one MISU series
 *   • crown sits ON the avatar; big Journey-Point number, small light "pts"
 *   • Top 4–10 as a clean list; when you're outside Top 10 a "···" + your row is
 *     appended; inside Top 10 your row is highlighted inline
 *   • gentle rise + crown-pop entrance (replayed on tab switch via remount key)
 * No numbers on crowns, no rank-change, no separate "my rank" card — by design.
 */

const CROWN_SRC = [
  "/assets/leaderboard/crown-gold.webp",
  "/assets/leaderboard/crown-silver.webp",
  "/assets/leaderboard/crown-bronze.webp",
];
const RANK_CLASS = ["lb-first", "lb-second", "lb-third"];

function fmtValue(v: number, def: LeaderboardSectionDef): string {
  return `${def.signed && v > 0 ? "+" : ""}${v.toLocaleString()}`;
}

export function PodiumBoard({ def, board }: { def: LeaderboardSectionDef; board: RankingBoard | undefined }) {
  if (board === undefined) {
    return (
      <div className="flex items-center justify-center rounded-card border border-line bg-surface py-16 shadow-elev1">
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

  const rows = board.rows;
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 10); // ranks 4–10
  const meRow = rows.find((r) => r.isMe);
  const appendMe = meRow && meRow.rank > 10 ? meRow : null;

  // display order: 2nd (left) · 1st (center, tallest) · 3rd (right)
  const podium: { row: RankRow | undefined; place: number }[] = [
    { row: top3[1], place: 1 },
    { row: top3[0], place: 0 },
    { row: top3[2], place: 2 },
  ];

  return (
    <div className="lb-root">
      <div className="lb-podium">
        {podium.map(({ row, place }) => (
          <div key={place} className={`lb-col ${RANK_CLASS[place]}`}>
            {row ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="lb-crown" src={CROWN_SRC[place]} alt="" aria-hidden />
                <div className="lb-av"><Avatar value={row.avatar} /></div>
                <div className="lb-pillar">
                  <div className="lb-name">
                    {row.name}
                    {row.isMe && "（我）"}
                  </div>
                  <div className="lb-pts">
                    {fmtValue(row.value, def)}
                    <span className="lb-u">{def.unit ?? "pts"}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="lb-pillar lb-empty" />
            )}
          </div>
        ))}
      </div>

      {(rest.length > 0 || appendMe) && (
        <div className="lb-list">
          {rest.map((r) => (
            <ListRow key={`${r.rank}-${r.name}`} row={r} def={def} />
          ))}
          {appendMe && (
            <>
              <div className="lb-more">· · ·</div>
              <ListRow row={appendMe} def={def} />
            </>
          )}
        </div>
      )}

      <style>{STYLE}</style>
    </div>
  );
}

function ListRow({ row, def }: { row: RankRow; def: LeaderboardSectionDef }) {
  return (
    <div className={`lb-row${row.isMe ? " lb-me" : ""}`}>
      <span className="lb-rk">{row.rank}</span>
      <span className="lb-ra"><Avatar value={row.avatar} /></span>
      <span className="lb-rn">
        {row.name}
        {row.isMe && "（我）"}
      </span>
      <span className="lb-rv">
        {fmtValue(row.value, def)}
        <span className="lb-u">{def.unit ?? "pts"}</span>
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
      return "这一周还没有人上榜。完成今天的 Journey，第一个站上领奖台的，可以是你。";
  }
}

const STYLE = `
.lb-root{ position:relative; }
.lb-podium{ display:grid; grid-template-columns:1fr 1.12fr 1fr; align-items:end; gap:9px; padding-top:40px; position:relative; }
.lb-podium::before{ content:""; position:absolute; left:50%; top:14px; width:300px; height:236px; transform:translateX(-50%);
  background:radial-gradient(circle, rgba(238,77,129,.11) 0%, rgba(238,77,129,0) 68%); filter:blur(6px); pointer-events:none; }
.lb-col{ position:relative; z-index:1; display:flex; flex-direction:column; align-items:center;
  animation:lb-rise .72s cubic-bezier(.32,.72,0,1) both; }
.lb-second{ animation-delay:.04s; } .lb-third{ animation-delay:.09s; } .lb-first{ animation-delay:.16s; }

.lb-crown{ display:block; height:auto; margin-bottom:-16px; position:relative; z-index:3;
  filter:drop-shadow(0 6px 9px rgba(52,49,58,.22)); animation:lb-pop .6s cubic-bezier(.34,1.56,.64,1) both; }
.lb-second .lb-crown, .lb-third .lb-crown{ width:44px; animation-delay:.30s; }
.lb-first .lb-crown{ width:65px; margin-bottom:-22px; animation-delay:.44s; }

.lb-av{ border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:500;
  background:#fdf4f7; position:relative; z-index:2; color:var(--color-ink); }
.lb-first .lb-av{ width:84px; height:84px; font-size:32px; box-shadow:0 0 0 3px #e7b94f, 0 10px 20px -8px rgba(0,0,0,.3); }
.lb-second .lb-av{ width:62px; height:62px; font-size:23px; box-shadow:0 0 0 2.5px #c9cdd4, 0 8px 16px -8px rgba(0,0,0,.25); }
.lb-third .lb-av{ width:62px; height:62px; font-size:23px; box-shadow:0 0 0 2.5px #dc9472, 0 8px 16px -8px rgba(0,0,0,.25); }

.lb-pillar{ width:100%; margin-top:-32px; padding:44px 8px 18px; text-align:center; border-radius:24px 24px 18px 18px;
  border:1px solid rgba(255,255,255,.8); position:relative; z-index:1;
  box-shadow:0 1px 0 rgba(255,255,255,.85) inset, 0 16px 30px -22px rgba(52,49,58,.3); }
.lb-first .lb-pillar{ min-height:162px; padding-top:54px; background:linear-gradient(180deg,#ffffff 0%, #f8d5e2 100%);
  border-color:rgba(238,77,129,.16);
  box-shadow:0 1px 0 rgba(255,255,255,.9) inset, 0 26px 48px -20px rgba(214,50,122,.32), 0 12px 26px -16px rgba(52,49,58,.22); }
.lb-second .lb-pillar{ min-height:118px; background:linear-gradient(180deg,#ffffff 0%, #fbe6ee 100%); }
.lb-third .lb-pillar{ min-height:106px; background:linear-gradient(180deg,#ffffff 0%, #fbe6ee 100%); }
.lb-empty{ background:transparent !important; border-color:transparent !important; box-shadow:none !important; }

.lb-name{ font-size:13px; font-weight:500; letter-spacing:-.005em; color:var(--color-ink); }
.lb-first .lb-name{ font-size:14px; }
.lb-pts{ margin-top:6px; font-size:16px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--color-ink); }
.lb-first .lb-pts{ margin-top:8px; font-size:23px; color:var(--color-brand-deep); }
.lb-u{ font-size:9px; font-weight:500; color:var(--color-ink-faint); margin-left:3px; }

.lb-list{ margin-top:20px; border-radius:20px; overflow:hidden;
  background:rgba(255,255,255,.68); border:1px solid rgba(255,255,255,.8);
  box-shadow:0 20px 40px -26px rgba(52,49,58,.4); backdrop-filter:blur(6px); }
.lb-row{ display:flex; align-items:center; gap:12px; padding:15px 16px; border-bottom:1px solid rgba(60,55,58,.05); }
.lb-row:last-child{ border-bottom:0; }
.lb-rk{ width:20px; text-align:center; font-size:13px; font-weight:600; color:var(--color-ink-faint); font-variant-numeric:tabular-nums; }
.lb-ra{ width:34px; height:34px; border-radius:50%; background:#fdf6f9; display:flex; align-items:center; justify-content:center;
  font-size:14px; box-shadow:0 0 0 1px rgba(238,77,129,.08); }
.lb-rn{ flex:1; min-width:0; font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--color-ink); }
.lb-rv{ font-size:14px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--color-ink); }
.lb-me{ background:var(--color-brand-tint); }
.lb-me .lb-rn, .lb-me .lb-rv, .lb-me .lb-rk{ color:var(--color-brand-deep); font-weight:600; }
.lb-me .lb-ra{ color:var(--color-brand-deep); box-shadow:0 0 0 1.5px var(--color-brand-soft); }
.lb-more{ text-align:center; color:var(--color-ink-faint); font-size:15px; letter-spacing:.25em; padding:6px 0 2px; }

@keyframes lb-rise{ from{opacity:0; transform:translateY(28px);} to{opacity:1; transform:none;} }
@keyframes lb-pop{ 0%{opacity:0; transform:translateY(10px) scale(.6);} 60%{transform:translateY(-3px) scale(1.08);} 100%{opacity:1; transform:none;} }
@media (prefers-reduced-motion:reduce){ .lb-col, .lb-crown{ animation:none !important; } }
`;
