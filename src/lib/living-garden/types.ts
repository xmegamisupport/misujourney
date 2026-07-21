/** ── Living Garden — the framework contract ────────────────────────────────
 *
 * The Living Garden is an emotional space, not a dashboard. This file defines
 * the ONE thing the renderer understands: a GardenState — a stack of layers,
 * each a list of placed sprites. Everything else (which day it is, how growth
 * paces, what a Journey Point is) lives outside and hands the renderer a
 * finished GardenState.
 *
 * The single most important rule of this framework:
 *   GardenScene knows nothing about Day 1 or Day 35, or about weight, points,
 *   or unlocking. It renders whatever GardenState it is given.
 * That is what makes the same renderer reusable for every future chapter,
 * season, and event without being touched.
 */

/** Back-to-front paint order. HUD is deliberately NOT here: it is interface,
 * not garden, and is rendered as a separate component on top of the scene. */
export const GARDEN_LAYERS = [
  "sky",
  "background",
  "ground",
  "plants",
  "animals",
  "buildings",
  "foreground",
] as const;

export type GardenLayerId = (typeof GARDEN_LAYERS)[number];

/** One placed thing in the scene. `sprite` is intentionally just a string —
 * today it is an emoji placeholder; tomorrow it can be an asset id resolved by
 * a sprite map, with no change to layout, layers, or the renderer. */
export interface GardenItem {
  /** Stable across days so the same element keeps its identity as it grows. */
  id: string;
  sprite: string;
  /** 0–100, percent of scene width (left edge origin). */
  x: number;
  /** 0–100, percent of scene height measured from the BOTTOM, so items "stand"
   * on the ground rather than hang from the top. */
  y: number;
  /** Relative size multiplier; 1 = base. */
  scale?: number;
  /** Ordering within a layer (higher paints later / in front). */
  depth?: number;
}

/** A layer may be a full-bleed wash (sky, ground) and/or a set of items. */
export interface GardenLayer {
  id: GardenLayerId;
  /** CSS background value for a full-bleed layer (gradient / colour). */
  fill?: string;
  items: GardenItem[];
}

/** Ambient tone the scene can read for washes and lighting. Kept small on
 * purpose — a chapter changes the mood by changing these, not the renderer. */
export interface GardenPalette {
  skyTop: string;
  skyBottom: string;
  ground: string;
  /** A soft vignette / light tint laid over everything. */
  light: string;
}

/** The complete thing the renderer draws. Nothing time- or rule-aware. */
export interface GardenState {
  palette: GardenPalette;
  layers: GardenLayer[];
}

/** ── Content authoring shape ────────────────────────────────────────────────
 * How a chapter DESCRIBES its world over time. The engine turns a list of these
 * plus a day number into a GardenState. This is the only place "growth" is
 * expressed; the renderer never sees it.
 *
 * An element persists once it appears and swaps sprite at each stage it reaches,
 * so a seed becoming a tree is one element with three stages — never three
 * elements popping in and out, which would read as flicker rather than growth. */
export interface GardenElementStage {
  /** Journey day (1-based) this sprite takes effect from. */
  day: number;
  sprite: string;
  scale?: number;
}

export interface GardenElement {
  id: string;
  layer: GardenLayerId;
  x: number;
  y: number;
  depth?: number;
  /** Ordered by day ascending; the latest stage with day ≤ current wins. The
   * element is absent until its first stage's day is reached. */
  stages: GardenElementStage[];
}

/** Palette keyframes let the light shift as the garden matures (a bare dawn
 * warming into a full afternoon). The engine interpolates between them. */
export interface GardenPaletteKeyframe {
  day: number;
  palette: GardenPalette;
}

/** A whole chapter's worth of content: the world's elements + how its light
 * changes. Swap this object and the same renderer plays a different chapter. */
export interface GardenChapter {
  id: string;
  /** Highest day this chapter is authored for (used by the preview tool). */
  lastDay: number;
  elements: GardenElement[];
  palette: GardenPaletteKeyframe[];
}
