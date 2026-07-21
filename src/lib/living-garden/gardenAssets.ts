import type { GardenLayerId } from "./types";

/** ── Living Garden — Asset Registry ─────────────────────────────────────────
 *
 * The single place every garden asset is declared. The rest of the system
 * refers to assets by ID (GRASS_01, FLOWER_PINK, RABBIT…), never by file — so
 * shipping real artwork later is a one-line-per-asset change here, with nothing
 * downstream touched.
 *
 * Today every asset renders through its `glyph` (an emoji placeholder), because
 * the approved framework renderer draws text sprites and is not modified this
 * sprint. `src` records where the real image will live — a placeholder file
 * already sits at that path — so the swap to final art is: drop the artwork at
 * `src` and, when the framework gains an image renderer, it reads `src` instead
 * of `glyph`. The IDs, layers, positions and day-unlocks never change.
 */
export type AssetCategory = "ground" | "plants" | "nature" | "animals" | "objects" | "effects";

export interface GardenAsset {
  id: string;
  category: AssetCategory;
  /** Which paint layer the asset lives in — one of the framework's layers. */
  layer: GardenLayerId;
  /** Placeholder drawn by the current text renderer. Replaced by `src` art later. */
  glyph: string;
  /** Where the real image will live; a placeholder already exists there today. */
  src: string;
  /** Default size; a placement may override per-instance. */
  baseScale: number;
}

const ASSET_ROOT = "/assets/living-garden";

function asset(
  id: string,
  category: AssetCategory,
  layer: GardenLayerId,
  glyph: string,
  baseScale = 1,
): GardenAsset {
  return { id, category, layer, glyph, baseScale, src: `${ASSET_ROOT}/${category}/${id.toLowerCase()}.svg` };
}

/** ~25 starter assets. Deliberately small — one obvious change a day needs
 * variety, not volume. New assets are appended here; nothing else changes. */
export const GARDEN_ASSETS: Record<string, GardenAsset> = {
  // ── Ground ────────────────────────────────────────────────────────────────
  GROUND_EMPTY: asset("GROUND_EMPTY", "ground", "ground", "", 1),
  GROUND_GRASS: asset("GROUND_GRASS", "ground", "ground", "🌱", 0.7),
  GROUND_DIRT: asset("GROUND_DIRT", "ground", "ground", "🟤", 0.8),

  // ── Plants ────────────────────────────────────────────────────────────────
  SPROUT: asset("SPROUT", "plants", "plants", "🌱", 0.8),
  GRASS_01: asset("GRASS_01", "plants", "plants", "🌿", 0.9),
  BUSH: asset("BUSH", "plants", "plants", "🪴", 1.2),
  FLOWER_PINK: asset("FLOWER_PINK", "plants", "plants", "🌸", 1),
  FLOWER_YELLOW: asset("FLOWER_YELLOW", "plants", "plants", "🌼", 1),
  FLOWER_WHITE: asset("FLOWER_WHITE", "plants", "plants", "🌷", 1),
  TREE_SMALL: asset("TREE_SMALL", "plants", "plants", "🌲", 1.7),
  TREE_BIG: asset("TREE_BIG", "plants", "plants", "🌳", 2.6),

  // ── Nature ────────────────────────────────────────────────────────────────
  STONE: asset("STONE", "nature", "plants", "🪨", 0.9),
  MUSHROOM: asset("MUSHROOM", "nature", "plants", "🍄", 0.8),
  POND: asset("POND", "nature", "ground", "🟦", 2.2),

  // ── Animals ───────────────────────────────────────────────────────────────
  BUTTERFLY: asset("BUTTERFLY", "animals", "animals", "🦋", 1),
  LADYBUG: asset("LADYBUG", "animals", "animals", "🐞", 0.8),
  BEE: asset("BEE", "animals", "animals", "🐝", 0.9),
  BIRD: asset("BIRD", "animals", "animals", "🐦", 1),
  RABBIT: asset("RABBIT", "animals", "animals", "🐰", 1.1),

  // ── Objects ───────────────────────────────────────────────────────────────
  FENCE: asset("FENCE", "objects", "buildings", "🪵", 1.2),
  BENCH: asset("BENCH", "objects", "buildings", "🪑", 1.2),
  BIRD_HOUSE: asset("BIRD_HOUSE", "objects", "buildings", "🏠", 1.2),
  FOUNTAIN: asset("FOUNTAIN", "objects", "buildings", "⛲", 1.7),

  // ── Effects ───────────────────────────────────────────────────────────────
  RAINBOW: asset("RAINBOW", "effects", "background", "🌈", 3),
  SUNLIGHT: asset("SUNLIGHT", "effects", "background", "🌤️", 2),
};

export const GARDEN_ASSET_LIST: GardenAsset[] = Object.values(GARDEN_ASSETS);
