/**
 * Pure calendar-date helpers for the Hidden Discovery engine.
 *
 * The engine consumes *journey dates* (`YYYY-MM-DD`) that the app already wrote
 * on the 04:00 boundary (checkin_date, log_date, earned_on, …), so streak math
 * here is plain calendar arithmetic — no timezone work. `applyDayBoundary` is
 * provided for the rare case a raw instant must be mapped to a journey date, and
 * makes the 04:00 rule explicit and testable.
 */

const DAY_MS = 86_400_000;

/** Parse a `YYYY-MM-DD` journey date to a UTC-midnight epoch (day index). */
function dayIndex(date: string): number {
  return Math.floor(Date.parse(date + "T00:00:00Z") / DAY_MS);
}

/** Unique, ascending `YYYY-MM-DD` list — collapses multiple same-day records. */
export function uniqueSortedDates(dates: string[]): string[] {
  return Array.from(new Set(dates.filter(Boolean))).sort();
}

/** Longest run of consecutive calendar days present in `dates`. */
export function longestConsecutiveRun(dates: string[]): number {
  const idx = uniqueSortedDates(dates).map(dayIndex);
  if (idx.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < idx.length; i++) {
    run = idx[i] === idx[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Consecutive days ending on the most recent date in `dates`. */
export function trailingRun(dates: string[]): number {
  const idx = uniqueSortedDates(dates).map(dayIndex);
  if (idx.length === 0) return 0;
  let run = 1;
  for (let i = idx.length - 1; i > 0; i--) {
    if (idx[i] === idx[i - 1] + 1) run++;
    else break;
  }
  return run;
}

/** Day-of-week name for a journey date (timezone-independent — the date is
 *  already local). Returns lowercase `sunday`…`saturday`. */
export function weekdayOf(date: string): string {
  const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return names[new Date(date + "T00:00:00Z").getUTCDay()];
}

/** How many of `dates` fall on the given weekday. */
export function countWeekday(dates: string[], weekday: string): number {
  const target = weekday.toLowerCase();
  return uniqueSortedDates(dates).filter((d) => weekdayOf(d) === target).length;
}

/**
 * Comeback detection: was there an inactivity gap of at least `minGapDays`,
 * followed by a trailing run of at least `returnDays` consecutive days?
 * Returns the gap and the return streak as evidence.
 */
export function comebackState(
  dates: string[],
  minGapDays: number,
  returnDays: number,
): { met: boolean; gapDays: number; returnStreak: number } {
  const idx = uniqueSortedDates(dates).map(dayIndex);
  const returnStreak = trailingRun(dates);
  if (idx.length < returnDays + 1) {
    return { met: false, gapDays: 0, returnStreak };
  }
  // The gap sits immediately before the trailing return run.
  const returnStart = idx.length - returnStreak;
  if (returnStart <= 0) return { met: false, gapDays: 0, returnStreak };
  const gapDays = idx[returnStart] - idx[returnStart - 1] - 1;
  return { met: gapDays >= minGapDays && returnStreak >= returnDays, gapDays, returnStreak };
}

/**
 * Map a raw instant to its journey date under the 04:00 boundary, given the
 * user's UTC offset in minutes. Explicit + pure so the boundary rule is testable
 * independent of any timezone database. (Runtime dates come pre-bounded from SQL;
 * this exists for completeness and the boundary test.)
 */
export function applyDayBoundary(instant: Date, offsetMinutes: number, boundaryHours = 4): string {
  const shifted = instant.getTime() + offsetMinutes * 60_000 - boundaryHours * 3_600_000;
  return new Date(shifted).toISOString().slice(0, 10);
}
