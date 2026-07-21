import type { GardenLayerId } from "./types";

/** ── Living Garden — Asset Registry ─────────────────────────────────────────
 *
 * The single place every garden asset is declared. The rest of the system
 * refers to assets by ID (GRASS_01, FLOWER_PINK, RABBIT…), never by file — so
 * shipping real artwork later is a one-line-per-asset change here, with nothing
 * downstream touched.
 *
 * Each asset now declares its official artwork `fileName` explicitly (no more
 * auto-deriving a name from the ID). Until that art exists it renders through
 * its `glyph` (an emoji placeholder). Flipping `art` to true — once the PNG is
 * dropped at `src` — makes the renderer draw the image instead. That one boolean
 * is the entire "emoji → PNG" switch for an asset; IDs, layers, positions and
 * day-unlocks never change.
 */
export type AssetCategory = "ground" | "plants" | "nature" | "animals" | "objects" | "effects";

export interface GardenAsset {
  id: string;
  category: AssetCategory;
  /** Which paint layer the asset lives in — one of the framework's layers. */
  layer: GardenLayerId;
  /** Official artwork filename: the simplest subject name + `.png`
   * (e.g. "sprout.png", "flower-pink.png"). No numbers, no version, no prefix. */
  fileName: string;
  /** Emoji placeholder, drawn while `art` is false. Replaced by the image later. */
  glyph: string;
  /** Resolved artwork path: `${ASSET_ROOT}/${category}/${fileName}`. */
  src: string;
  /** Flip to true once the real PNG exists at `src`; the renderer then draws the
   * image instead of `glyph`. This is the whole per-asset emoji→PNG switch. */
  art: boolean;
  /** Default size; a placement may override per-instance. */
  baseScale: number;
}

const ASSET_ROOT = "/assets/living-garden";

function asset(
  id: string,
  category: AssetCategory,
  layer: GardenLayerId,
  fileName: string,
  glyph: string,
  baseScale = 1,
): GardenAsset {
  return {
    id,
    category,
    layer,
    fileName,
    glyph,
    baseScale,
    art: false,
    src: fileName ? `${ASSET_ROOT}/${category}/${fileName}` : "",
  };
}

/** ~25 starter assets. Deliberately small — one obvious change a day needs
 * variety, not volume. New assets are appended here; nothing else changes. */
export const GARDEN_ASSETS: Record<string, GardenAsset> = {
  // ── Ground ────────────────────────────────────────────────────────────────
  GROUND_EMPTY: asset("GROUND_EMPTY", "ground", "ground", "", "", 1),
  GROUND_GRASS: asset("GROUND_GRASS", "ground", "ground", "ground-grass.png", "🌱", 0.7),
  GROUND_DIRT: asset("GROUND_DIRT", "ground", "ground", "ground-dirt.png", "🟤", 0.8),

  // ── Plants ────────────────────────────────────────────────────────────────
  SPROUT: asset("SPROUT", "plants", "plants", "sprout.png", "🌱", 0.8),
  GRASS_01: asset("GRASS_01", "plants", "plants", "grass.png", "🌿", 0.9),
  BUSH: asset("BUSH", "plants", "plants", "bush.png", "🪴", 1.2),
  FLOWER_PINK: asset("FLOWER_PINK", "plants", "plants", "flower-pink.png", "🌸", 1),
  FLOWER_YELLOW: asset("FLOWER_YELLOW", "plants", "plants", "flower-yellow.png", "🌼", 1),
  FLOWER_WHITE: asset("FLOWER_WHITE", "plants", "plants", "flower-white.png", "🌷", 1),
  TREE_SMALL: asset("TREE_SMALL", "plants", "plants", "tree-small.png", "🌲", 1.7),
  TREE_BIG: asset("TREE_BIG", "plants", "plants", "tree-big.png", "🌳", 2.6),

  // ── Nature ────────────────────────────────────────────────────────────────
  STONE: asset("STONE", "nature", "plants", "stone.png", "🪨", 0.9),
  MUSHROOM: asset("MUSHROOM", "nature", "plants", "mushroom.png", "🍄", 0.8),
  POND: asset("POND", "nature", "ground", "pond.png", "🟦", 2.2),

  // ── Animals ───────────────────────────────────────────────────────────────
  BUTTERFLY: asset("BUTTERFLY", "animals", "animals", "butterfly.png", "🦋", 1),
  LADYBUG: asset("LADYBUG", "animals", "animals", "ladybug.png", "🐞", 0.8),
  BEE: asset("BEE", "animals", "animals", "bee.png", "🐝", 0.9),
  BIRD: asset("BIRD", "animals", "animals", "bird.png", "🐦", 1),
  RABBIT: asset("RABBIT", "animals", "animals", "rabbit.png", "🐰", 1.1),

  // ── Objects ───────────────────────────────────────────────────────────────
  FENCE: asset("FENCE", "objects", "buildings", "fence.png", "🪵", 1.2),
  BENCH: asset("BENCH", "objects", "buildings", "bench.png", "🪑", 1.2),
  BIRD_HOUSE: asset("BIRD_HOUSE", "objects", "buildings", "birdhouse.png", "🏠", 1.2),
  FOUNTAIN: asset("FOUNTAIN", "objects", "buildings", "fountain.png", "⛲", 1.7),

  // ── Effects ───────────────────────────────────────────────────────────────
  // Atmospheric, not sticker art — deferred from the first PNG batch on purpose.
  RAINBOW: asset("RAINBOW", "effects", "background", "rainbow.png", "🌈", 3),
  SUNLIGHT: asset("SUNLIGHT", "effects", "background", "sunlight.png", "🌤️", 2),
};

export const GARDEN_ASSET_LIST: GardenAsset[] = Object.values(GARDEN_ASSETS);
