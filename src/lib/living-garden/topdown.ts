import { isUnlocked } from "./discovery";

/** ── Living Garden — Top-Down Foundation Spike ──────────────────────────────
 *
 * A minimal, isolated data model for the TOP-DOWN prototype, gated behind
 * `?topdown=1`. It deliberately does NOT touch the side-view engine, types, or
 * renderer — the approved customer experience stays byte-identical. It reuses
 * the existing discovery engine (`isUnlocked`) so top-down assets unlock by the
 * same Journey-day logic as everything else; only the *rendering perspective*
 * differs (see TopDownScene).
 *
 * Coordinate convention for top-down (differs from side-view on purpose):
 *   x  — 0–100, percent from the LEFT of the scene.
 *   y  — 0–100, percent from the TOP (a map point, not a ground line).
 *   Anchor is the asset's CENTRE (translate(-50%, -50%)), because a top-down
 *   object sits ON a spot rather than standing on a baseline. This is why the
 *   side-view bottom-centre anchor is not reused here.
 */

export interface TopDownAsset {
  id: string;
  /** Image path. A placeholder today; the real top-down PNG drops in here later. */
  src: string;
  /** 0–100, percent from the left. */
  x: number;
  /** 0–100, percent from the top. */
  y: number;
  /** On-screen width as a percent of the scene width (height follows aspect). */
  widthPct: number;
  /** Explicit paint order; higher renders in front. Kept below the HUD/chrome. */
  zIndex: number;
  /** Reuses the day/progress engine: appears from this Journey day onward. */
  visibleFromDay: number;
}

/** Approved terrain-only production background (941×1672, 9:16). Terrain + fixed
 * world structure only; every day-gated asset renders as a separate layer above. */
export const TOPDOWN_BACKGROUND = "/assets/living-garden/backgrounds/terrain.png";

/** The whole vertical slice: exactly one independently-positioned top-down asset,
 * placed in the central Ancient Tree growth area, unlocked from Day 1. */
export const TOPDOWN_ASSETS: TopDownAsset[] = [
  {
    id: "td_sprout",
    src: "/assets/living-garden/plants/sprout-topdown-placeholder.svg",
    x: 50,
    y: 40,
    widthPct: 14,
    zIndex: 10,
    visibleFromDay: 1,
  },
];

/** Top-down assets visible on a given Journey day, via the existing engine. */
export function visibleTopDownAssets(day: number): TopDownAsset[] {
  return TOPDOWN_ASSETS.filter((a) => isUnlocked({ type: "day", day: a.visibleFromDay }, { day }));
}
