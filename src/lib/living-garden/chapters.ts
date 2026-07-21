import { PLACEHOLDER_CHAPTER } from "./garden-data";
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
export interface LivingGardenChapterMeta {
  id: string;
  /** Roman numeral shown on the spine — "I", "II", "III". */
  numeral: string;
  /** The chapter's own name, in the customer's language. */
  title: string;
  /** English fairy-tale name, for flavour under the title. */
  subtitle: string;
  status: "available" | "coming_soon";
  /** Length of the chapter in Journey days, for the progress line. */
  totalDays: number;
  /** The garden this chapter opens into. Absent until the chapter is built. */
  content?: GardenChapter;
}

export const LIVING_GARDEN_CHAPTERS: LivingGardenChapterMeta[] = [
  {
    id: "forgotten-garden",
    numeral: "I",
    title: "被遗忘的花园",
    subtitle: "The Forgotten Garden",
    status: "available",
    totalDays: PLACEHOLDER_CHAPTER.lastDay,
    content: PLACEHOLDER_CHAPTER,
  },
  {
    id: "forest-awakens",
    numeral: "II",
    title: "森林苏醒",
    subtitle: "Forest Awakens",
    status: "coming_soon",
    totalDays: 35,
  },
  {
    id: "crystal-lake",
    numeral: "III",
    title: "水晶湖",
    subtitle: "Crystal Lake",
    status: "coming_soon",
    totalDays: 35,
  },
];
