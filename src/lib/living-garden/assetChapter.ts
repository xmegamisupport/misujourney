import { GARDEN_ASSETS } from "./gardenAssets";
import { GARDEN_PLACEMENTS } from "./dayUnlocks";
import type { GardenChapter, GardenElement, GardenPaletteKeyframe } from "./types";

/** ── Asset system → framework adapter ───────────────────────────────────────
 *
 * The one seam between the new content system and the approved framework. It
 * turns (assets + day-unlock placements) into the framework's GardenChapter, so
 * the UNCHANGED engine renders, accumulates and layers it, and the UNCHANGED
 * founder preview scrubs it. Nothing in the framework learns that an "asset
 * system" exists — it just receives a chapter.
 *
 * Accumulation and layering are NOT re-implemented here: each placement becomes
 * an element with a single stage at its visibleFromDay, and the engine already
 * keeps every element whose day ≤ today and paints it in its layer. One obvious
 * thing a day, everything stays — for free.
 */
const CHAPTER_DAYS = 35;

const elements: GardenElement[] = GARDEN_PLACEMENTS.map((placement) => {
  const asset = GARDEN_ASSETS[placement.asset];
  // rotation is intentionally carried in the placement but not mapped onto the
  // element: the current text renderer has no rotation, and the framework is
  // not modified this sprint. It is ready for the image renderer to read later.
  // The sprite is the emoji glyph until this asset's real art is switched on
  // (`art: true`), at which point it becomes the PNG path. The renderer decides
  // image-vs-text from the string itself, so nothing else in the pipeline changes.
  const sprite = asset.art ? asset.src : asset.glyph;
  return {
    id: placement.id,
    layer: asset.layer,
    x: placement.x,
    y: placement.y,
    depth: placement.zIndex,
    stages: [{ day: placement.visibleFromDay, sprite, scale: placement.scale ?? asset.baseScale }],
  } satisfies GardenElement;
});

/** Light warms from a soft dawn into a full golden afternoon as the garden
 * fills — interpolated by the engine, same as any chapter. */
const palette: GardenPaletteKeyframe[] = [
  { day: 1, palette: { skyTop: "#c7e9ff", skyBottom: "#eef8ef", ground: "#c9e4a8", light: "rgba(255,255,255,0.10)" } },
  { day: 12, palette: { skyTop: "#a9dcff", skyBottom: "#eafaf0", ground: "#bfe39a", light: "rgba(255,255,255,0.04)" } },
  { day: 25, palette: { skyTop: "#8fd0ff", skyBottom: "#f2fbe9", ground: "#aedd86", light: "rgba(255,244,214,0.10)" } },
  { day: 35, palette: { skyTop: "#87cdf6", skyBottom: "#fbf6df", ground: "#a3d977", light: "rgba(255,238,196,0.16)" } },
];

/** The live Living Garden content, built from the asset system. Chapter I of the
 * storybook points at this. To retune the garden, edit the asset registry or the
 * day-unlock placements — never this file, and never the framework. */
export const ASSET_CHAPTER: GardenChapter = {
  id: "living-garden-v1",
  lastDay: CHAPTER_DAYS,
  elements,
  palette,
};
