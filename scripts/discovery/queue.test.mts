// Celebration-queue priority + ordering. Run: npm run test:discovery
import { test } from "node:test";
import assert from "node:assert/strict";
import { rarityRank, queuePriority, orderForCelebration } from "../../src/lib/discovery/engine/queue.mts";

test("rarity rank orders Legendary > Epic > Rare > Common", () => {
  assert.ok(rarityRank("legendary") > rarityRank("epic"));
  assert.ok(rarityRank("epic") > rarityRank("rare"));
  assert.ok(rarityRank("rare") > rarityRank("common"));
  assert.equal(rarityRank("something-unknown"), 1);
});

test("queue priority: rarity dominates; lower discovery priority breaks ties", () => {
  assert.ok(queuePriority("legendary", 99) > queuePriority("epic", 1));
  assert.ok(queuePriority("epic", 10) > queuePriority("epic", 40));
});

test("orderForCelebration surfaces the rarest, highest-priority unlock first", () => {
  const items = [
    { rarity: "common", discoveryPriority: 12, unlockedAt: "2026-01-01T00:00:00Z" },
    { rarity: "legendary", discoveryPriority: 70, unlockedAt: "2026-01-01T00:00:05Z" },
    { rarity: "epic", discoveryPriority: 60, unlockedAt: "2026-01-01T00:00:03Z" },
    { rarity: "epic", discoveryPriority: 30, unlockedAt: "2026-01-01T00:00:04Z" },
  ];
  const ordered = orderForCelebration(items);
  assert.deepEqual(
    ordered.map((i) => `${i.rarity}:${i.discoveryPriority}`),
    ["legendary:70", "epic:30", "epic:60", "common:12"],
  );
});
