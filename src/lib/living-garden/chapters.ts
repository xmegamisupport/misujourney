import { ASSET_CHAPTER } from "./assetChapter";
import type { GardenChapter } from "./types";

/** ── The chapter book ───────────────────────────────────────────────────────
 *
 * The permanent table of contents for every Living Garden world. This is
 * metadata for the storybook entrance — a chapter's numeral, name, and whether
 * it can be opened yet — kept separate from the render content (GardenChapter),
 * which only the engine cares about.
 *
 * Adding Chapter IV, V, VI is one more entry in this array and nothing else:
 * the book maps over it, so future worlds never require the entrance to be
 * redesigned. An available chapter carries its `content`; a coming-soon one
 * simply has none yet. */
/** The palette of one volume's illustrated cover. Kept as data so a new volume
 * is a themed page, not a new component — the cover renderer reads these. */
export interface VolumeCoverTheme {
  sky1: string;
  sky2: string;
  orb: string;
  hillBack: string;
  hillFront: string;
  trunk: string;
  accent: string;
}

export interface LivingGardenChapterMeta {
  id: string;
  /** Roman numeral shown on the spine — "I", "II", "III". */
  numeral: string;
  /** The chapter's own name, in the customer's language. */
  title: string;
  /** English fairy-tale name, for flavour under the title. */
  subtitle: string;
  /** One line of story that sits on the page — the reason to open this world. */
  story: string;
  status: "available" | "coming_soon";
  /** Length of the chapter in Journey days, for the progress line. */
  totalDays: number;
  /** Palette for this volume's illustrated cover. */
  cover: VolumeCoverTheme;
  /** The garden this chapter opens into. Absent until the chapter is built. */
  content?: GardenChapter;
}

export const LIVING_GARDEN_CHAPTERS: LivingGardenChapterMeta[] = [
  {
    id: "forgotten-garden",
    numeral: "I",
    title: "被遗忘的花园",
    subtitle: "The Forgotten Garden",
    story: "你的每一个健康选择，都让这座被遗忘的花园，重新苏醒。",
    status: "available",
    totalDays: ASSET_CHAPTER.lastDay,
    cover: { sky1: "#ffe7bd", sky2: "#bfe0c0", orb: "#ffd98a", hillBack: "#9fca9f", hillFront: "#6ba678", trunk: "#7a5a42", accent: "#f6c766" },
    // Chapter I now plays the asset-driven garden. Swapping back to the original
    // hand-authored placeholder is a one-word change: PLACEHOLDER_CHAPTER.
    content: ASSET_CHAPTER,
  },
  {
    id: "forest-awakens",
    numeral: "II",
    title: "森林苏醒",
    subtitle: "Forest Awakens",
    story: "森林深处，有什么，正在悄悄醒来。",
    status: "coming_soon",
    totalDays: 35,
    cover: { sky1: "#284a44", sky2: "#40705d", orb: "#dcefc9", hillBack: "#2d5a4b", hillFront: "#173a33", trunk: "#3c2f26", accent: "#9fe6c0" },
  },
  {
    id: "crystal-lake",
    numeral: "III",
    title: "水晶湖",
    subtitle: "Crystal Lake",
    story: "越过山丘，一整片水晶湖，静静地等着你。",
    status: "coming_soon",
    totalDays: 35,
    cover: { sky1: "#cdd8ff", sky2: "#a7c6f4", orb: "#eef4ff", hillBack: "#89a5df", hillFront: "#5a73c3", trunk: "#3f4a72", accent: "#c9b7ff" },
  },
];
