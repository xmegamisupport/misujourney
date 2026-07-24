import type { BadgeState, LevelDef } from "./types";

/** Earliest date in a list of YYYY-MM-DD strings (null when empty). */
export function earliest(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((min, d) => (d < min ? d : min));
}

/** Longest run of consecutive calendar days in a list of YYYY-MM-DD strings. */
export function longestStreak(dates: string[]): number {
  const uniq = Array.from(new Set(dates)).sort();
  if (uniq.length === 0) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < uniq.length; i++) {
    const prev = Date.parse(`${uniq[i - 1]}T00:00:00Z`);
    const curr = Date.parse(`${uniq[i]}T00:00:00Z`);
    const diffDays = Math.round((curr - prev) / 86_400_000);
    if (diffDays === 1) {
      cur += 1;
      best = Math.max(best, cur);
    } else if (diffDays !== 0) {
      cur = 1;
    }
  }
  return best;
}

/** Longest run of consecutive integers (e.g. journey day numbers). */
export function longestConsecutive(nums: number[]): number {
  const uniq = Array.from(new Set(nums)).sort((a, b) => a - b);
  if (uniq.length === 0) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i]! - uniq[i - 1]! === 1) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}

/**
 * Resolve a cumulative count into a level + within-level progress.
 * Crossing a threshold naturally "resets" the ring toward the next level.
 */
export function resolveLevel(lifetime: number, streak: number, levels: LevelDef[]): BadgeState {
  let idx = -1;
  for (let i = 0; i < levels.length; i++) {
    if (lifetime >= levels[i]!.threshold) idx = i;
  }
  const maxed = idx === levels.length - 1;
  const curThreshold = idx >= 0 ? levels[idx]!.threshold : 0;
  const nextLevel = maxed ? null : levels[idx + 1]!;
  const nextThreshold = nextLevel ? nextLevel.threshold : curThreshold;

  const progressInLevel = lifetime - curThreshold;
  const targetInLevel = maxed ? Math.max(1, progressInLevel) : nextThreshold - curThreshold;
  const remaining = maxed ? 0 : nextThreshold - lifetime;
  const ringPercent = maxed ? 1 : targetInLevel > 0 ? progressInLevel / targetInLevel : 0;

  return {
    lifetime,
    streak,
    levelIndex: idx,
    levelKey: idx >= 0 ? levels[idx]!.key : null,
    nextKey: nextLevel ? nextLevel.key : null,
    progressInLevel,
    targetInLevel,
    remaining,
    maxed,
    ringPercent: Math.min(1, Math.max(0, ringPercent)),
  };
}
