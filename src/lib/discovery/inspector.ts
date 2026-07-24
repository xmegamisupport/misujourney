/**
 * Hidden Discovery — Inspector (Phase 4, internal/admin only, SERVER-ONLY).
 *
 * For a given user, evaluates EVERY discovery (enabled + disabled) against their
 * live snapshot and joins it with unlock history + queue state, so a developer or
 * support agent can see exactly why each discovery is or isn't unlocked. Reads
 * trigger conditions from the Registry (never shipped to the browser); the raw
 * per-user data comes from the admin-gated `admin_discovery_state` RPC.
 */
import type { EngineClient, SnapshotRaw } from "./engine/dataAccess.ts";
import { REGISTRY_DEFS, REGISTRY_VERSION } from "./engine/index";
import { evaluateDiscovery } from "./engine/evaluators.mts";
import { supportAudit } from "./engine/registry.mts";
import type { DiscoveryDef, EvalResult, SnapshotContext } from "./engine/types.mts";

interface UnlockRow {
  code: string;
  unlockedAt: string;
  revealedAt: string | null;
  sourceEvent: string | null;
  triggerEvidence: unknown;
  registryVersion: string | null;
  unlockScope: string;
  journeyId: string | null;
  stage: number | null;
  dedupKey: string;
}
interface QueueRow {
  code: string;
  status: string;
  priority: number;
  queuedAt: string;
  displayedAt: string | null;
  acknowledgedAt: string | null;
}
interface AdminState {
  snapshot: SnapshotRaw | null;
  unlocks: UnlockRow[];
  queue: QueueRow[];
}

/** Four-value display status (spec): the one badge to show at a glance. */
export type DisplayStatus = "unlocked" | "disabled" | "unsupported" | "locked";

/** Latest evaluation verdict (spec). */
export type EvaluationLabel =
  | "already_unlocked"
  | "skipped"
  | "unsupported"
  | "eligible"
  | "not_eligible";

export interface InspectionRow {
  discoveryId: string;
  name: string;
  icon: string;
  category: string;
  rarity: string;
  celebrationType: string;
  enabled: boolean;
  unlockScope: string;
  registryVersion: string;
  triggerType: string;
  condition: Record<string, unknown>;
  supported: boolean;
  unsupportedReason?: string;
  /** true/false unlock; kept for back-compat. See `displayStatus` for the badge. */
  status: "unlocked" | "locked";
  displayStatus: DisplayStatus;
  evaluationLabel: EvaluationLabel;
  evaluation: EvalResult;
  progress: string;
  progressPercent: number | null;
  unlock?: UnlockRow;
  queue?: QueueRow;
  whyLocked?: string;
}

export interface InspectionReport {
  userId: string;
  registryVersion: string;
  snapshotAvailable: boolean;
  counts: { total: number; unlocked: number; locked: number; supported: number; unsupported: number };
  rows: InspectionRow[];
}

function toCtx(s: SnapshotRaw): SnapshotContext {
  return {
    timezone: s.timezone,
    occurredAt: new Date(),
    signals: s.signals ?? {},
    weight: s.weight ?? { baselineKg: null, currentKg: null },
    goal: s.goal ?? { stage: null, targetMaxKg: null },
    journey: s.journey ?? { days: null, currentDay: null, completed: false },
  };
}

function pct(cur: unknown, target: unknown, text: string): { text: string; percent: number | null } {
  const c = Number(cur ?? 0);
  const t = Number(target ?? 0);
  return { text, percent: t > 0 ? Math.max(0, Math.min(100, Math.round((c / t) * 100))) : null };
}

/** Human-readable trigger progress from the evaluator's evidence. */
function deriveProgress(def: DiscoveryDef, r: EvalResult): { text: string; percent: number | null } {
  const e = (r.evidence ?? {}) as Record<string, unknown>;
  if (!r.supported) return { text: r.reason ?? "unsupported", percent: null };
  switch (def.triggerType) {
    case "first_time":
      return { text: `${e.count ?? 0} recorded (need 1)`, percent: Number(e.count ?? 0) >= 1 ? 100 : 0 };
    case "consecutive_days":
      return pct(e.longestRun, e.days, `${e.longestRun ?? 0} / ${e.days} consecutive days`);
    case "accumulated_count":
      return pct(e.total, e.threshold, `${e.total ?? 0} / ${e.threshold}`);
    case "calendar_condition":
      return pct(e.qualifying, e.need, `${e.qualifying ?? 0} / ${e.need} qualifying`);
    case "weight_delta":
      return pct(e.lostKg, e.thresholdKg, `${e.lostKg ?? 0} / ${e.thresholdKg} kg lost`);
    case "goal_achievement":
      return {
        text: `stage ${e.stage} (need ${e.requiredStage}), current ${e.currentKg} ≤ target ${e.targetMaxKg}`,
        percent: r.met ? 100 : 0,
      };
    case "journey_completion":
      if (Number(e.journeyDays) !== Number(e.requiredDays)) {
        return { text: `journey length ${e.journeyDays}d ≠ required ${e.requiredDays}d`, percent: 0 };
      }
      return pct(
        e.currentDay,
        e.requiredDays,
        `Journey Day ${e.currentDay ?? 0} / ${e.requiredDays}${e.completed ? " · completed" : ""}`,
      );
    case "comeback":
      return {
        text: `gap ${e.gapDays}/${e.minGapDays}d, return ${e.returnStreak}/${e.returnDays}d`,
        percent: r.met ? 100 : 0,
      };
    default:
      return { text: r.reason ?? "—", percent: null };
  }
}

export async function inspectUserDiscoveries(supabase: EngineClient, userId: string): Promise<InspectionReport> {
  const { data } = await supabase.rpc("admin_discovery_state", { p_user_id: userId });
  const state = (data ?? null) as AdminState | null;

  const snapshot = state?.snapshot ?? null;
  const ctx = snapshot ? toCtx(snapshot) : null;
  const unlockByCode = new Map((state?.unlocks ?? []).map((u) => [u.code, u]));
  const queueByCode = new Map((state?.queue ?? []).map((q) => [q.code, q]));
  const support = new Map(supportAudit(REGISTRY_DEFS).map((s) => [s.id, s]));

  const rows: InspectionRow[] = REGISTRY_DEFS.map((def) => {
    const sup = support.get(def.id);
    const evaluation: EvalResult = ctx
      ? evaluateDiscovery(def, ctx)
      : { met: false, supported: false, reason: "no snapshot available for user" };
    const unlock = unlockByCode.get(def.id);
    const queue = queueByCode.get(def.id);
    const status: "unlocked" | "locked" = unlock ? "unlocked" : "locked";
    const isSupported = sup?.supported ?? true;
    const progress = deriveProgress(def, evaluation);

    // Four-value badge + evaluation verdict (unlocked wins, then disabled,
    // then unsupported, then locked).
    const displayStatus: DisplayStatus = unlock
      ? "unlocked"
      : !def.enabled
        ? "disabled"
        : !isSupported
          ? "unsupported"
          : "locked";
    const evaluationLabel: EvaluationLabel = unlock
      ? "already_unlocked"
      : !def.enabled
        ? "skipped"
        : !isSupported || !evaluation.supported
          ? "unsupported"
          : evaluation.met
            ? "eligible"
            : "not_eligible";

    let whyLocked: string | undefined;
    if (status === "locked") {
      if (!def.enabled) whyLocked = "disabled in Registry (staged rollout)";
      else if (!evaluation.supported) whyLocked = `unsupported: ${evaluation.reason ?? "n/a"}`;
      else if (!evaluation.met) whyLocked = `not yet met — ${progress.text}`;
      else whyLocked = "conditions met, but no unlock recorded (event not yet fired for this user)";
    }

    return {
      discoveryId: def.id,
      name: def.name,
      icon: def.icon,
      category: def.category,
      rarity: def.rarity,
      celebrationType: def.celebrationType,
      enabled: def.enabled,
      unlockScope: def.unlockScope,
      registryVersion: def.registryVersion,
      triggerType: def.triggerType,
      condition: def.condition,
      supported: isSupported,
      unsupportedReason: sup?.reason,
      status,
      displayStatus,
      evaluationLabel,
      evaluation,
      progress: progress.text,
      progressPercent: progress.percent,
      unlock,
      queue,
      whyLocked,
    };
  });

  const unlocked = rows.filter((r) => r.status === "unlocked").length;
  const supported = rows.filter((r) => r.supported).length;
  return {
    userId,
    registryVersion: REGISTRY_VERSION,
    snapshotAvailable: snapshot != null,
    counts: {
      total: rows.length,
      unlocked,
      locked: rows.length - unlocked,
      supported,
      unsupported: rows.length - supported,
    },
    rows,
  };
}
