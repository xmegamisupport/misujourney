/**
 * Reusable trigger evaluators. One pure function per trigger type; the engine
 * dispatches on `def.triggerType` and passes the Registry `condition` — so a new
 * discovery is data, never a new function. No individual discovery is named here.
 */
import type { DiscoveryDef, EvalResult, SignalData, SnapshotContext, SignalKey } from "./types.mts";
import {
  longestConsecutiveRun,
  countWeekday,
  comebackState,
  uniqueSortedDates,
} from "./streak.mts";

const num = (v: unknown, fallback = NaN): number =>
  typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : fallback;
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const round2 = (n: number) => Math.round(n * 100) / 100;

function signal(ctx: SnapshotContext, source: string | null): SignalData | undefined {
  if (!source) return undefined;
  return ctx.signals[source as SignalKey];
}

const JOURNEY_DAYS: Record<string, number> = { kickstart: 30, momentum: 60, transformation: 90 };

/** Evaluate one discovery against a snapshot. Pure. */
export function evaluateDiscovery(def: DiscoveryDef, ctx: SnapshotContext): EvalResult {
  const c = def.condition;

  switch (def.triggerType) {
    case "first_time": {
      const source = str(c.source);
      const sig = signal(ctx, source);
      if (!sig) return unsupported(`no signal data for "${source}"`);
      return { met: sig.count >= 1, supported: true, evidence: { source, count: sig.count } };
    }

    case "consecutive_days": {
      const source = str(c.source);
      const days = num(c.days);
      const sig = signal(ctx, source);
      if (!sig) return unsupported(`no signal data for "${source}"`);
      if (!Number.isFinite(days)) return unsupported("missing `days`");
      const run = longestConsecutiveRun(sig.dates);
      return { met: run >= days, supported: true, evidence: { source, days, longestRun: run } };
    }

    case "accumulated_count": {
      const source = str(c.source);
      const count = num(c.count);
      const sig = signal(ctx, source);
      if (!sig) return unsupported(`no signal data for "${source}"`);
      if (!Number.isFinite(count)) return unsupported("missing `count`");
      return { met: sig.count >= count, supported: true, evidence: { source, threshold: count, total: sig.count } };
    }

    case "calendar_condition": {
      const source = str(c.source);
      const sig = signal(ctx, source);
      if (!sig) return unsupported(`no signal data for "${source}"`);
      const need = Number.isFinite(num(c.count)) ? num(c.count) : 1;

      if (typeof c.weekday === "string") {
        const qualifying = countWeekday(sig.dates, c.weekday);
        return { met: qualifying >= need, supported: true, evidence: { weekday: c.weekday, qualifying, need } };
      }
      if (typeof c.before === "string" || typeof c.after === "string") {
        if (!sig.times) return unsupported(`no time-of-day data for "${source}"`);
        const before = str(c.before);
        const after = str(c.after);
        const qualifying = sig.times.filter((t) =>
          (before ? t.localTime < before : true) && (after ? t.localTime > after : true),
        ).length;
        return { met: qualifying >= need, supported: true, evidence: { before, after, qualifying, need } };
      }
      if (typeof c.on === "string") {
        const mmdd = c.on;
        const qualifying = uniqueSortedDates(sig.dates).filter((d) => d.slice(5) === mmdd).length;
        return { met: qualifying >= need, supported: true, evidence: { on: mmdd, qualifying, need } };
      }
      return unsupported("unrecognized calendar condition (need weekday | before/after | on)");
    }

    case "weight_delta": {
      const kg = num(c.kg);
      const { baselineKg, currentKg } = ctx.weight;
      if (baselineKg == null || currentKg == null) return unsupported("missing weight baseline or current weight");
      if (!Number.isFinite(kg)) return unsupported("missing `kg`");
      const lost = round2(baselineKg - currentKg);
      return { met: lost >= kg, supported: true, evidence: { baselineKg, currentKg, lostKg: lost, thresholdKg: kg } };
    }

    case "goal_achievement": {
      const goal = str(c.goal); // e.g. "phase_1"
      const requiredStage = goal ? Number(goal.replace(/[^0-9]/g, "")) : NaN;
      const { stage, targetMaxKg } = ctx.goal;
      const { currentKg } = ctx.weight;
      if (stage == null || targetMaxKg == null || currentKg == null) {
        return unsupported("missing goal stage / target / current weight");
      }
      if (!Number.isFinite(requiredStage)) return unsupported(`unrecognized goal "${goal}"`);
      // No historical goal snapshots exist, so a stage goal can only be confirmed
      // while the user is AT that stage. Documented limitation.
      const met = stage === requiredStage && currentKg <= targetMaxKg;
      return { met, supported: true, evidence: { goal, requiredStage, stage, targetMaxKg, currentKg } };
    }

    case "journey_completion": {
      const which = str(c.which);
      const requiredDays = which ? JOURNEY_DAYS[which] : undefined;
      if (!requiredDays) return unsupported(`unrecognized journey "${which}"`);
      const { days, completed, currentDay } = ctx.journey;
      if (days == null) return unsupported("no journey length recorded");
      const met = days === requiredDays && completed === true;
      return { met, supported: true, evidence: { journeyDays: days, requiredDays, currentDay, completed } };
    }

    case "comeback": {
      const minGapDays = num(c.minGapDays);
      const returnDays = num(c.returnDays);
      const sig = signal(ctx, "daily_complete");
      if (!sig) return unsupported("no daily-completion data");
      if (!Number.isFinite(minGapDays) || !Number.isFinite(returnDays)) return unsupported("missing gap/return config");
      const s = comebackState(sig.dates, minGapDays, returnDays);
      return {
        met: s.met,
        supported: true,
        evidence: { minGapDays, returnDays, gapDays: s.gapDays, returnStreak: s.returnStreak },
      };
    }

    case "custom":
      return unsupported(`custom rule "${str(c.rule) ?? "?"}" is not implemented`);

    default:
      return unsupported(`unknown trigger type "${def.triggerType}"`);
  }
}

function unsupported(reason: string): EvalResult {
  return { met: false, supported: false, reason };
}
