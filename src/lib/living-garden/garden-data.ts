import type { GardenChapter, GardenElement, GardenElementStage, GardenLayerId, GardenPaletteKeyframe } from "./types";

/** ── Placeholder content — NOT the framework ────────────────────────────────
 *
 * This is a stand-in chapter so the founder can preview growth pacing across 35
 * days. Every sprite here is an emoji placeholder and every position is
 * hand-authored; none of it is final art, and the whole file is meant to be
 * replaced by real chapter content later. What matters is the SHAPE: a chapter
 * is a list of elements-over-time plus a light that shifts — nothing here
 * touches the renderer or the engine.
 *
 * Each element persists once it appears and swaps sprite as it grows, so a seed
 * becoming a tree reads as one thing maturing rather than objects popping in.
 */

const CHAPTER_LAST_DAY = 35;

function grow(
  id: string,
  layer: GardenLayerId,
  x: number,
  y: number,
  stages: [day: number, sprite: string, scale?: number][],
  depth?: number,
): GardenElement {
  return {
    id,
    layer,
    x,
    y,
    depth,
    stages: stages.map(([day, sprite, scale]): GardenElementStage => ({ day, sprite, scale })),
  };
}

/** A patch of grass that thickens over the first two weeks. Scattered
 * deterministically so the field looks organic but never jumps between days. */
function grassField(): GardenElement[] {
  const out: GardenElement[] = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const x = 4 + (i * 92) / (count - 1);
    const y = 4 + ((i * 37) % 14); // deterministic gentle scatter
    const appear = 1 + (i % 6); // grass fills in over days 1–6
    out.push(
      grow(`grass-${i}`, "plants", x, y, [
        [appear, "🌱", 0.7],
        [appear + 4, "🌿", 0.9],
      ]),
    );
  }
  return out;
}

/** Flowers open across the first three weeks, each a bud that blooms. */
function flowers(): GardenElement[] {
  const palette = ["🌼", "🌸", "🌷", "🌻", "🌺"];
  const out: GardenElement[] = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    const x = 8 + (i * 84) / (count - 1);
    const y = 6 + ((i * 53) % 12);
    const appear = 2 + i * 2; // days 2, 4, 6 … staggered blooming
    out.push(
      grow(`flower-${i}`, "plants", x, y, [
        [appear, "🌱", 0.6],
        [appear + 2, palette[i % palette.length], 1],
      ]),
    );
  }
  return out;
}

const PLACEHOLDER_ELEMENTS: GardenElement[] = [
  // ── Background scenery — present throughout, sets the horizon ──────────────
  grow("hill-left", "background", 16, 20, [[1, "⛰️", 3.4]], 0),
  grow("hill-right", "background", 78, 18, [[1, "⛰️", 3.0]], 0),
  grow("sun", "background", 82, 74, [
    [1, "🌤️", 2.2],
    [12, "☀️", 2.6],
  ], 1),
  grow("rainbow", "background", 40, 52, [[29, "🌈", 3.2]], 2),

  // ── The signature tree — a seed on day 1, a full canopy by the end ─────────
  grow("hero-tree", "plants", 30, 8, [
    [1, "🌰", 0.8],
    [6, "🌱", 1.0],
    [13, "🌿", 1.4],
    [20, "🌲", 2.2],
    [28, "🌳", 3.0],
  ], 20),
  // A second tree that arrives later, so the garden keeps changing after week 3.
  grow("second-tree", "plants", 66, 8, [
    [16, "🌱", 1.0],
    [24, "🌲", 1.8],
    [32, "🌳", 2.4],
  ], 18),

  ...grassField(),
  ...flowers(),

  // ── Animals — the garden comes alive once there is something to live in ────
  grow("butterfly-1", "animals", 44, 34, [[14, "🦋", 1.1]], 5),
  grow("butterfly-2", "animals", 58, 42, [[22, "🦋", 1.0]], 5),
  grow("bee", "animals", 26, 30, [[18, "🐝", 0.9]], 5),
  grow("bird", "animals", 70, 56, [[24, "🐦", 1.1]], 4),
  grow("chick", "animals", 50, 8, [[30, "🐤", 0.9]], 6),

  // ── Buildings — a sign the garden has become a place, late in the chapter ──
  grow("well", "buildings", 14, 6, [[21, "⛲", 1.8]], 10),
  grow("house", "buildings", 84, 7, [[29, "🏡", 2.2]], 10),

  // ── Foreground — big tufts near the very bottom edge, for depth ────────────
  grow("fg-grass-1", "foreground", 10, 2, [[3, "🌾", 2.2]], 30),
  grow("fg-grass-2", "foreground", 92, 2, [[8, "🌾", 2.4]], 30),
  grow("fg-grass-3", "foreground", 52, 1, [[16, "🌾", 2.0]], 30),
];

/** Light warms from a pale dawn into a full, golden afternoon as the garden
 * matures — the engine interpolates between these. */
const PLACEHOLDER_PALETTE: GardenPaletteKeyframe[] = [
  { day: 1, palette: { skyTop: "#c7e9ff", skyBottom: "#eef8ef", ground: "#c9e4a8", light: "rgba(255,255,255,0.10)" } },
  { day: 12, palette: { skyTop: "#a9dcff", skyBottom: "#eafaf0", ground: "#bfe39a", light: "rgba(255,255,255,0.04)" } },
  { day: 25, palette: { skyTop: "#8fd0ff", skyBottom: "#f2fbe9", ground: "#aedd86", light: "rgba(255,244,214,0.10)" } },
  { day: 35, palette: { skyTop: "#87cdf6", skyBottom: "#fbf6df", ground: "#a3d977", light: "rgba(255,238,196,0.16)" } },
];

/** The one placeholder chapter this sprint ships. Later sprints add more
 * chapters (seasons, events) as sibling objects of exactly this shape. */
export const PLACEHOLDER_CHAPTER: GardenChapter = {
  id: "placeholder-v1",
  lastDay: CHAPTER_LAST_DAY,
  elements: PLACEHOLDER_ELEMENTS,
  palette: PLACEHOLDER_PALETTE,
};
