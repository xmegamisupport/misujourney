import { GARDEN_ASSETS } from "./gardenAssets";

/** ── Living Garden — Day Unlock System ──────────────────────────────────────
 *
 * What appears on each Journey day. The guiding rule is quiet discovery: ONE
 * obvious new thing per day, and everything ever unlocked stays — so the garden
 * only ever grows richer. There are no unlock popups, no chimes, no story; the
 * customer simply opens the garden and notices "今天多了一样东西."
 *
 * A placement is one instance of an asset at a spot. Because the framework
 * engine keeps every element whose day ≤ today, listing a placement here with
 * `visibleFromDay = N` is all it takes for it to appear from day N onward and
 * never leave. Positions are data, not code — tweak x/y/scale/rotation freely.
 */
export interface AssetPlacement {
  /** Unique per placement (an asset can be placed many times). */
  id: string;
  /** Asset ID from GARDEN_ASSETS. */
  asset: keyof typeof GARDEN_ASSETS;
  /** 0–100, percent of scene width. */
  x: number;
  /** 0–100, percent of scene height from the BOTTOM (so it stands on the ground). */
  y: number;
  /** Overrides the asset's baseScale for this instance. */
  scale?: number;
  /** Degrees. Stored for the future image renderer; the text renderer ignores it. */
  rotation?: number;
  /** Ordering within a layer (higher = in front). */
  zIndex?: number;
  /** The day this placement first appears — and stays from. */
  visibleFromDay: number;
}

/** Day 1 is bare ground (GROUND_EMPTY = nothing placed). From Day 2 one thing
 * arrives each day. Read top-to-bottom as the garden's diary. */
export const GARDEN_PLACEMENTS: AssetPlacement[] = [
  // Day 2 — the first sprout
  { id: "p_sprout", asset: "SPROUT", x: 50, y: 8, visibleFromDay: 2 },
  // Day 3 — grass begins
  { id: "p_grass_1", asset: "GRASS_01", x: 30, y: 6, visibleFromDay: 3 },
  // Day 4 — more grass
  { id: "p_grass_2", asset: "GRASS_01", x: 70, y: 6, visibleFromDay: 4 },
  // Day 5 — first flower
  { id: "p_flower_1", asset: "FLOWER_PINK", x: 42, y: 7, rotation: -8, visibleFromDay: 5 },
  // Day 6 — a mushroom
  { id: "p_mushroom_1", asset: "MUSHROOM", x: 20, y: 5, visibleFromDay: 6 },
  // Day 7 — a stone
  { id: "p_stone_1", asset: "STONE", x: 80, y: 5, visibleFromDay: 7 },
  // Day 8 — the first visitor: a ladybug
  { id: "p_ladybug", asset: "LADYBUG", x: 35, y: 15, visibleFromDay: 8 },
  // Day 9 — a yellow flower
  { id: "p_flower_2", asset: "FLOWER_YELLOW", x: 60, y: 7, rotation: 6, visibleFromDay: 9 },
  // Day 10 — a small tree
  { id: "p_tree_1", asset: "TREE_SMALL", x: 25, y: 8, zIndex: 1, visibleFromDay: 10 },
  // Day 11 — grass spreads to the edge
  { id: "p_grass_3", asset: "GRASS_01", x: 88, y: 6, visibleFromDay: 11 },
  // Day 12 — warm light
  { id: "p_sunlight", asset: "SUNLIGHT", x: 82, y: 74, zIndex: 0, visibleFromDay: 12 },
  // Day 13 — a white flower
  { id: "p_flower_3", asset: "FLOWER_WHITE", x: 52, y: 8, visibleFromDay: 13 },
  // Day 14 — a butterfly
  { id: "p_butterfly_1", asset: "BUTTERFLY", x: 46, y: 30, visibleFromDay: 14 },
  // Day 15 — a bush
  { id: "p_bush_1", asset: "BUSH", x: 66, y: 7, zIndex: 2, visibleFromDay: 15 },
  // Day 16 — a little dirt path
  { id: "p_dirt_1", asset: "GROUND_DIRT", x: 12, y: 4, visibleFromDay: 16 },
  // Day 17 — a bee
  { id: "p_bee", asset: "BEE", x: 28, y: 26, visibleFromDay: 17 },
  // Day 18 — more pink
  { id: "p_flower_4", asset: "FLOWER_PINK", x: 75, y: 7, rotation: 5, visibleFromDay: 18 },
  // Day 19 — a second stone
  { id: "p_stone_2", asset: "STONE", x: 50, y: 4, visibleFromDay: 19 },
  // Day 20 — the first built thing: a fence
  { id: "p_fence", asset: "FENCE", x: 8, y: 6, visibleFromDay: 20 },
  // Day 21 — a bird arrives
  { id: "p_bird_1", asset: "BIRD", x: 72, y: 40, visibleFromDay: 21 },
  // Day 22 — yellow near the left
  { id: "p_flower_5", asset: "FLOWER_YELLOW", x: 18, y: 7, visibleFromDay: 22 },
  // Day 23 — another mushroom
  { id: "p_mushroom_2", asset: "MUSHROOM", x: 62, y: 5, visibleFromDay: 23 },
  // Day 24 — a bench to sit
  { id: "p_bench", asset: "BENCH", x: 48, y: 5, visibleFromDay: 24 },
  // Day 25 — white on the right
  { id: "p_flower_6", asset: "FLOWER_WHITE", x: 82, y: 7, visibleFromDay: 25 },
  // Day 26 — a rabbit
  { id: "p_rabbit", asset: "RABBIT", x: 38, y: 5, visibleFromDay: 26 },
  // Day 27 — a bush on the left
  { id: "p_bush_2", asset: "BUSH", x: 14, y: 7, zIndex: 2, visibleFromDay: 27 },
  // Day 28 — a big tree grows on the right
  { id: "p_tree_2", asset: "TREE_BIG", x: 70, y: 8, zIndex: 1, visibleFromDay: 28 },
  // Day 29 — a bird house
  { id: "p_birdhouse", asset: "BIRD_HOUSE", x: 78, y: 18, visibleFromDay: 29 },
  // Day 30 — a second butterfly
  { id: "p_butterfly_2", asset: "BUTTERFLY", x: 58, y: 34, visibleFromDay: 30 },
  // Day 31 — one more bloom
  { id: "p_flower_7", asset: "FLOWER_PINK", x: 30, y: 7, rotation: -6, visibleFromDay: 31 },
  // Day 32 — a pond forms
  { id: "p_pond", asset: "POND", x: 50, y: 3, zIndex: 0, visibleFromDay: 32 },
  // Day 33 — a fountain
  { id: "p_fountain", asset: "FOUNTAIN", x: 86, y: 6, visibleFromDay: 33 },
  // Day 34 — a rainbow over the hills
  { id: "p_rainbow", asset: "RAINBOW", x: 40, y: 52, zIndex: 0, visibleFromDay: 34 },
  // Day 35 — one last bird, the garden full
  { id: "p_bird_2", asset: "BIRD", x: 20, y: 44, visibleFromDay: 35 },
];

/** Founder-readable diary of what each day introduces. Not shown to customers —
 * discovery must stay silent — but handy when reviewing pacing. */
export const DAY_UNLOCK_NOTES: Record<number, string> = {
  1: "空地",
  2: "第一株嫩芽",
  3: "草地开始",
  4: "更多草",
  5: "第一朵花",
  6: "蘑菇",
  7: "石头",
  8: "第一位访客：瓢虫",
  9: "黄花",
  10: "小树苗",
  11: "草蔓延到边缘",
  12: "温暖的阳光",
  13: "白花",
  14: "蝴蝶",
  15: "灌木",
  16: "一小段泥土小径",
  17: "蜜蜂",
  18: "更多粉色",
  19: "第二块石头",
  20: "第一个建造物：篱笆",
  21: "小鸟来了",
  22: "左边的黄花",
  23: "另一朵蘑菇",
  24: "长椅",
  25: "右边的白花",
  26: "兔子",
  27: "左边的灌木",
  28: "右边长出大树",
  29: "鸟屋",
  30: "第二只蝴蝶",
  31: "再开一朵花",
  32: "水池成形",
  33: "喷泉",
  34: "山丘上的彩虹",
  35: "最后一只鸟，花园满了",
};
