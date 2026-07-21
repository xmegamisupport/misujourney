import { TOPDOWN_BACKGROUND, visibleTopDownAssets } from "@/lib/living-garden/topdown";

/** ── Top-down renderer (foundation spike, `?topdown=1` only) ─────────────────
 *
 * A deliberately small, separate renderer that proves the top-down slice without
 * touching the approved side-view GardenScene/engine. It draws:
 *   1. one full-screen terrain-only background, `object-cover` (portrait
 *      mobile-first; overflow crops at the edges, the centre safe zone is kept
 *      via `object-position: center`), and
 *   2. one independently-positioned top-down asset, unlocked by the existing
 *      Journey-day engine, centre-anchored, sized as a percent of scene width so
 *      it stays proportional across mobile viewport ratios.
 *
 * No discoverable object lives in the background — every asset is a separate,
 * day-gated layer on top.
 */
export function TopDownScene({ day }: { day: number }) {
  const assets = visibleTopDownAssets(day);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "#c9e6ab" }}
      role="img"
      aria-label="你的花园（俯视图）"
    >
      {/* Full-screen terrain background — covers the viewport, centre preserved. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TOPDOWN_BACKGROUND}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-cover"
        style={{ objectPosition: "center" }}
      />

      {/* Independently-positioned, day-unlocked top-down assets. */}
      {assets.map((a) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={a.id}
          src={a.src}
          alt=""
          draggable={false}
          className="absolute select-none"
          style={{
            left: `${a.x}%`,
            top: `${a.y}%`,
            width: `${a.widthPct}%`,
            height: "auto",
            transform: "translate(-50%, -50%)",
            zIndex: a.zIndex,
          }}
        />
      ))}
    </div>
  );
}
