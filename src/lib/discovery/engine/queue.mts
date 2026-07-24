/**
 * Celebration-queue ordering. Presentation is deliberately separate from
 * evaluation: the engine only decides WHAT unlocked; this decides the order a
 * future UI would surface them. Mirrors the priority the SQL RPC stores, so the
 * TS ordering and the DB `priority` column never disagree.
 */

/** Rarity weight — dominates ordering. Legendary → Common. */
export function rarityRank(rarity: string): number {
  switch (rarity) {
    case "legendary":
      return 4;
    case "epic":
      return 3;
    case "rare":
      return 2;
    default:
      return 1; // common / unknown
  }
}

/** The integer stored on the queue row (higher shows first). */
export function queuePriority(rarity: string, discoveryPriority: number): number {
  return rarityRank(rarity) * 100_000 - discoveryPriority;
}

/** Order unlocks for presentation: rarity desc, then discovery priority, then time. */
export function orderForCelebration<
  T extends { rarity: string; discoveryPriority: number; unlockedAt: string },
>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      rarityRank(b.rarity) - rarityRank(a.rarity) ||
      a.discoveryPriority - b.discoveryPriority ||
      a.unlockedAt.localeCompare(b.unlockedAt),
  );
}
