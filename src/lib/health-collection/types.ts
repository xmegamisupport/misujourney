import type { ProductCode } from "@/lib/inventory/types";

/**
 * Health Collection — Master Badges.
 *
 * Philosophy: we reward healthy HABITS, not weight-loss results. Every Master
 * Badge levels up forever from cumulative (never consecutive) completions, and
 * every badge is verified automatically from data MISU already stores — no
 * manual claims, no AI, no estimates.
 *
 * The whole system is configuration-driven: a new badge is a new entry in
 * config.ts (id, icon, copy, and a pure `compute` over the raw data), never a
 * rewrite of the engine.
 */

export type LevelKey = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "legend";

export interface LevelDef {
  key: LevelKey;
  /** Cumulative completions needed to REACH this level. */
  threshold: number;
  name: string; // zh label
  color: string; // ring / accent colour
  soft: string; // soft background tint
}

/** Raw, already-aggregated inputs the badges compute from (all read-only). */
export interface RawBadgeData {
  /** earned_on dates where the customer completed their whole daily Journey. */
  dailyCompleteDates: string[];
  /** checkin_date for every morning weigh-in (weight recorded). */
  weighInDates: string[];
  /** log_date for every day the water target was met. */
  waterDates: string[];
  /** journey day_number for every completed daily learning. */
  learningDays: number[];
  /** cumulative sachets used, per product. */
  sachetUsed: Record<ProductCode, number>;
}

export interface BadgeCount {
  /** Lifetime cumulative completions (drives the level). */
  lifetime: number;
  /** Highest run of consecutive days (0 when a badge doesn't track streaks). */
  streak: number;
}

export interface BadgeDef {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Whether "highest streak" is meaningful for this badge (day-based ones). */
  trackStreak: boolean;
  /** Pure: turn the raw data into this badge's cumulative count + streak. */
  compute: (data: RawBadgeData) => BadgeCount;
  /** Per-badge override of the shared level ladder (defaults to LEVELS). */
  levels?: LevelDef[];
}

/** A badge's fully-resolved state, ready to render. */
export interface BadgeState extends BadgeCount {
  /** Index into levels; -1 means not yet at Bronze (locked). */
  levelIndex: number;
  levelKey: LevelKey | null;
  nextKey: LevelKey | null;
  /** Progress within the current level band. */
  progressInLevel: number;
  targetInLevel: number;
  /** Completions remaining until the next level (0 when maxed). */
  remaining: number;
  maxed: boolean;
  /** 0..1 fill of the ring. */
  ringPercent: number;
}

export interface BadgeView extends BadgeState {
  def: BadgeDef;
  levels: LevelDef[];
}

/** A level-up to celebrate. */
export interface BadgeUpgrade {
  badgeId: string;
  title: string;
  icon: string;
  level: LevelDef;
}
