// Trigger evaluators + event relevance. Run: npm run test:discovery
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateDiscovery } from "../../src/lib/discovery/engine/evaluators.mts";
import { relevantDiscoveries, EVENT } from "../../src/lib/discovery/engine/events.mts";
import type { DiscoveryDef, SnapshotContext, SignalData } from "../../src/lib/discovery/engine/types.mts";

function def(triggerType: DiscoveryDef["triggerType"], condition: Record<string, unknown>, over: Partial<DiscoveryDef> = {}): DiscoveryDef {
  return {
    id: "x", name: "n", icon: "i", description: "d", category: "c", rarity: "common",
    celebrationType: "surprise", triggerType, condition, unlockScope: "lifetime",
    enabled: true, registryVersion: "1.0.0", ...over,
  };
}
function sig(dates: string[], times?: SignalData["times"]): SignalData {
  return { dates, count: new Set(dates).size, times };
}
function ctx(over: Partial<SnapshotContext> = {}): SnapshotContext {
  return {
    timezone: "Asia/Kuala_Lumpur", occurredAt: new Date("2026-02-01T00:00:00Z"),
    signals: {}, weight: { baselineKg: null, currentKg: null },
    goal: { stage: null, targetMaxKg: null },
    journey: { days: null, currentDay: null, completed: false }, ...over,
  };
}

test("first_time: a first qualifying record unlocks; none does not", () => {
  const d = def("first_time", { source: "daily_complete" });
  assert.equal(evaluateDiscovery(d, ctx({ signals: { daily_complete: sig(["2026-01-01"]) } })).met, true);
  assert.equal(evaluateDiscovery(d, ctx({ signals: { daily_complete: sig([]) } })).met, false);
});

test("accumulated_count unlocks exactly at or after the threshold", () => {
  const d = def("accumulated_count", { source: "water", count: 100 });
  const dates = (n: number) => Array.from({ length: n }, (_, i) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`);
  assert.equal(evaluateDiscovery(d, ctx({ signals: { water: sig(dates(99)) } })).met, false);
  assert.equal(evaluateDiscovery(d, ctx({ signals: { water: sig(dates(100)) } })).met, true);
  assert.equal(evaluateDiscovery(d, ctx({ signals: { water: sig(dates(120)) } })).met, true);
});

test("consecutive_days needs an unbroken run", () => {
  const d = def("consecutive_days", { source: "water", days: 7 });
  const seven = ["01", "02", "03", "04", "05", "06", "07"].map((x) => `2026-03-${x}`);
  const brokenSix = ["01", "02", "03", "05", "06", "07", "08"].map((x) => `2026-03-${x}`);
  assert.equal(evaluateDiscovery(d, ctx({ signals: { water: sig(seven) } })).met, true);
  assert.equal(evaluateDiscovery(d, ctx({ signals: { water: sig(brokenSix) } })).met, false);
});

test("calendar_condition weekday counts Sundays (not ordinary streaks)", () => {
  const d = def("calendar_condition", { source: "daily_complete", weekday: "sunday", count: 3 });
  const threeSundays = ["2026-01-04", "2026-01-11", "2026-01-18"];
  const threeConsecutive = ["2026-01-05", "2026-01-06", "2026-01-07"];
  assert.equal(evaluateDiscovery(d, ctx({ signals: { daily_complete: sig(threeSundays) } })).met, true);
  assert.equal(evaluateDiscovery(d, ctx({ signals: { daily_complete: sig(threeConsecutive) } })).met, false);
});

test("calendar_condition before-time needs timestamps; water has none (unsupported)", () => {
  const early = def("calendar_condition", { source: "weighin", before: "07:00", count: 1 });
  const withTime = ctx({ signals: { weighin: sig(["2026-01-01"], [{ date: "2026-01-01", localTime: "06:42" }]) } });
  const lateTime = ctx({ signals: { weighin: sig(["2026-01-01"], [{ date: "2026-01-01", localTime: "07:30" }]) } });
  assert.equal(evaluateDiscovery(early, withTime).met, true);
  assert.equal(evaluateDiscovery(early, lateTime).met, false);

  const waterEarly = def("calendar_condition", { source: "water", before: "18:00", count: 1 });
  const r = evaluateDiscovery(waterEarly, ctx({ signals: { water: sig(["2026-01-01"]) } }));
  assert.equal(r.supported, false);
});

test("weight_delta measures loss from the recorded journey baseline", () => {
  const d = def("weight_delta", { kg: 5 });
  const hit = evaluateDiscovery(d, ctx({ weight: { baselineKg: 80, currentKg: 74 } }));
  assert.equal(hit.met, true);
  assert.deepEqual(hit.evidence, { baselineKg: 80, currentKg: 74, lostKg: 6, thresholdKg: 5 });
  assert.equal(evaluateDiscovery(d, ctx({ weight: { baselineKg: 80, currentKg: 76 } })).met, false);
  assert.equal(evaluateDiscovery(d, ctx({ weight: { baselineKg: null, currentKg: 74 } })).supported, false);
});

test("goal_achievement uses the matching stage's target", () => {
  const d = def("goal_achievement", { goal: "phase_1" });
  assert.equal(evaluateDiscovery(d, ctx({ goal: { stage: 1, targetMaxKg: 70 }, weight: { baselineKg: 80, currentKg: 69 } })).met, true);
  // reached the number but on a different stage → cannot confirm phase_1
  assert.equal(evaluateDiscovery(d, ctx({ goal: { stage: 2, targetMaxKg: 70 }, weight: { baselineKg: 80, currentKg: 69 } })).met, false);
  // still above target
  assert.equal(evaluateDiscovery(d, ctx({ goal: { stage: 1, targetMaxKg: 70 }, weight: { baselineKg: 80, currentKg: 71 } })).met, false);
});

test("a 60-day journey is NOT awarded the 30-day (Kickstart) completion", () => {
  const kickstart = def("journey_completion", { scope: "journey", which: "kickstart" }); // 30
  const momentum = def("journey_completion", { scope: "journey", which: "momentum" }); // 60
  const sixtyDone = ctx({ journey: { days: 60, currentDay: 60, completed: true } });
  assert.equal(evaluateDiscovery(kickstart, sixtyDone).met, false);
  assert.equal(evaluateDiscovery(momentum, sixtyDone).met, true);
  // 30-day but not actually completed
  assert.equal(evaluateDiscovery(kickstart, ctx({ journey: { days: 30, currentDay: 30, completed: false } })).met, false);
});

test("comeback needs the inactive gap AND the return streak", () => {
  const d = def("comeback", { minGapDays: 7, returnDays: 3 });
  const gapReturn = ctx({ signals: { daily_complete: sig(["2026-01-01", "2026-01-02", "2026-01-15", "2026-01-16", "2026-01-17"]) } });
  const oneBack = ctx({ signals: { daily_complete: sig(["2026-01-01", "2026-01-15"]) } });
  assert.equal(evaluateDiscovery(d, gapReturn).met, true);
  assert.equal(evaluateDiscovery(d, oneBack).met, false);
});

test("custom rules are reported unsupported, never silently unlocked", () => {
  const d = def("custom", { rule: "start_new_journey", params: {} });
  const r = evaluateDiscovery(d, ctx());
  assert.equal(r.supported, false);
  assert.equal(r.met, false);
});

test("event relevance: a morning weigh-in never evaluates food discoveries", () => {
  const defs: DiscoveryDef[] = [
    def("first_time", { source: "weighin" }, { id: "weigh-first" }),
    def("weight_delta", { kg: 5 }, { id: "lose-5" }),
    def("accumulated_count", { source: "meal", count: 100 }, { id: "meals-100" }),
    def("accumulated_count", { source: "water", count: 100 }, { id: "water-100" }),
  ];
  const ids = relevantDiscoveries(EVENT.MORNING_WEIGHT_RECORDED, defs).map((d) => d.id);
  assert.ok(ids.includes("weigh-first"));
  assert.ok(ids.includes("lose-5"));
  assert.ok(!ids.includes("meals-100"));
  assert.ok(!ids.includes("water-100"));
});

test("disabled discoveries are never relevant", () => {
  const defs = [def("first_time", { source: "weighin" }, { id: "off", enabled: false })];
  assert.equal(relevantDiscoveries(EVENT.MORNING_WEIGHT_RECORDED, defs).length, 0);
});
