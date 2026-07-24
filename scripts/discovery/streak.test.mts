// Pure date/streak helpers. Run: npm run test:discovery
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  uniqueSortedDates,
  longestConsecutiveRun,
  trailingRun,
  weekdayOf,
  countWeekday,
  comebackState,
  applyDayBoundary,
} from "../../src/lib/discovery/engine/streak.mts";

test("multiple records on the same day count as one qualifying day", () => {
  const d = uniqueSortedDates(["2026-01-01", "2026-01-01", "2026-01-02"]);
  assert.deepEqual(d, ["2026-01-01", "2026-01-02"]);
  assert.equal(longestConsecutiveRun(["2026-01-01", "2026-01-01", "2026-01-02"]), 2);
});

test("consecutive-day logic breaks the streak on a missed day", () => {
  assert.equal(
    longestConsecutiveRun(["2026-01-01", "2026-01-02", "2026-01-04", "2026-01-05", "2026-01-06"]),
    3,
  );
  assert.equal(longestConsecutiveRun([]), 0);
});

test("trailingRun counts consecutive days ending at the latest date", () => {
  assert.equal(trailingRun(["2026-01-01", "2026-01-03", "2026-01-04", "2026-01-05"]), 3);
});

test("weekday is computed correctly (2026-01-04 is a Sunday)", () => {
  assert.equal(weekdayOf("2026-01-04"), "sunday");
  assert.equal(weekdayOf("2026-01-05"), "monday");
});

test("three Sundays are counted as Sundays, not as a 3-day streak", () => {
  const sundays = ["2026-01-04", "2026-01-11", "2026-01-18"];
  assert.equal(countWeekday(sundays, "sunday"), 3);
  // three CONSECUTIVE ordinary days contain zero Sundays
  const consecutive = ["2026-01-05", "2026-01-06", "2026-01-07"];
  assert.equal(countWeekday(consecutive, "sunday"), 0);
});

test("comeback requires BOTH the inactive gap and the return streak", () => {
  const gapThenReturn = ["2026-01-01", "2026-01-02", "2026-01-15", "2026-01-16", "2026-01-17"];
  assert.deepEqual(comebackState(gapThenReturn, 7, 3), { met: true, gapDays: 12, returnStreak: 3 });
  // returned for only 1 day → not a comeback
  const oneDayBack = ["2026-01-01", "2026-01-02", "2026-01-15"];
  assert.equal(comebackState(oneDayBack, 7, 3).met, false);
  // no gap at all → not a comeback
  const noGap = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"];
  assert.equal(comebackState(noGap, 7, 3).met, false);
});

test("04:00 day boundary: before 04:00 rolls back to the previous journey day", () => {
  // 2026-01-02 03:30 local in UTC+8  →  journey date 2026-01-01
  assert.equal(applyDayBoundary(new Date("2026-01-01T19:30:00Z"), 480, 4), "2026-01-01");
  // 2026-01-02 04:30 local in UTC+8  →  journey date 2026-01-02
  assert.equal(applyDayBoundary(new Date("2026-01-01T20:30:00Z"), 480, 4), "2026-01-02");
});
