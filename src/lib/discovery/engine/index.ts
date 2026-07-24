/**
 * Hidden Discovery Engine — server-side orchestrator (Phase 3).
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ SERVER-ONLY. Import this from API routes / server actions / event        │
 * │ producers — never from a client component. It reads trigger CONDITIONS   │
 * │ from the Registry JSON (bundled server-side), so importing it into the   │
 * │ browser would leak the hidden unlock conditions.                         │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Flow for one event:
 *   1. validate the event type
 *   2. pick the RELEVANT enabled discoveries (a weigh-in never checks food)
 *   3. fetch the caller's snapshot (one DEFINER read RPC)
 *   4. evaluate each relevant discovery (pure evaluators)
 *   5. persist fired unlocks idempotently + queue them (one DEFINER write RPC)
 *   6. return a structured result — presentation decisions stay elsewhere
 *
 * Idempotency & concurrency are guaranteed by the database (the scope-aware
 * unique index + on-conflict-do-nothing in record_hidden_discovery_unlocks),
 * not by any check-then-insert here.
 */
import registryJson from "../../../../config/hidden-discovery-registry.json";
import { parseRegistry, supportAudit, type RawRegistry } from "./registry.mts";
import { relevantDiscoveries, isKnownEvent, type EventType } from "./events.mts";
import { evaluateDiscovery } from "./evaluators.mts";
import type { EngineResult, SnapshotContext } from "./types.mts";
import {
  fetchSnapshot,
  recordUnlocks,
  type EngineClient,
  type SnapshotRaw,
  type UnlockRequest,
} from "./dataAccess.ts";

const RAW = registryJson as RawRegistry;
const DEFS = parseRegistry(RAW);
const REGISTRY_VERSION = RAW.$meta?.version ?? "unknown";

export interface EvaluateInput {
  supabase: EngineClient;
  eventType: string;
  eventPayload?: Record<string, unknown>;
  occurredAt?: Date | string;
  /** Optional pre-fetched snapshot (skips the read RPC — used in batching/tests). */
  snapshot?: SnapshotRaw;
}

/**
 * Evaluate one user-related event and unlock any newly-earned discoveries.
 * Never throws — discoveries are a delight layer; failures surface in `errors`.
 */
export async function evaluateHiddenDiscoveries(input: EvaluateInput): Promise<EngineResult> {
  const { supabase, eventType } = input;
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  const result: EngineResult = {
    event: eventType,
    evaluatedDiscoveryIds: [],
    newUnlocks: [],
    alreadyUnlocked: [],
    unsupported: [],
    errors: [],
  };

  if (!isKnownEvent(eventType)) {
    result.errors.push(`unknown_event:${eventType}`);
    return result;
  }

  const relevant = relevantDiscoveries(eventType as EventType, DEFS);
  if (relevant.length === 0) return result;

  const raw = input.snapshot ?? (await fetchSnapshot(supabase).catch(() => null));
  if (!raw) {
    // no customer / no data / RPC failure — nothing to evaluate against
    if (!input.snapshot) result.errors.push("snapshot_unavailable");
    return result;
  }

  const ctx: SnapshotContext = {
    timezone: raw.timezone,
    occurredAt,
    signals: raw.signals ?? {},
    weight: raw.weight ?? { baselineKg: null, currentKg: null },
    goal: raw.goal ?? { stage: null, targetMaxKg: null },
    journey: raw.journey ?? { days: null, currentDay: null, completed: false },
    payload: input.eventPayload,
  };

  const metIds: string[] = [];
  const fired: UnlockRequest[] = [];
  for (const def of relevant) {
    result.evaluatedDiscoveryIds.push(def.id);
    const r = evaluateDiscovery(def, ctx);
    if (!r.supported) {
      result.unsupported.push({ discoveryId: def.id, reason: r.reason ?? "unsupported" });
      continue;
    }
    if (r.met) {
      metIds.push(def.id);
      fired.push({
        code: def.id,
        source_event: eventType,
        journey_id: null,
        stage: null,
        evidence: { ...(r.evidence ?? {}), event: eventType, occurredAt: occurredAt.toISOString() },
        registry_version: def.registryVersion,
      });
    }
  }

  if (fired.length === 0) return result;

  const unlocks = await recordUnlocks(supabase, fired).catch(() => {
    result.errors.push("record_failed");
    return [];
  });
  result.newUnlocks = unlocks;
  const newIds = new Set(unlocks.map((u) => u.discoveryId));
  // met but not newly inserted ⇒ already unlocked (idempotency in action)
  result.alreadyUnlocked = metIds.filter((id) => !newIds.has(id));

  return result;
}

/** Registry support audit (for docs / an ops endpoint). */
export function describeRegistrySupport() {
  return supportAudit(DEFS);
}

export { DEFS as REGISTRY_DEFS, REGISTRY_VERSION };
export type { EngineResult } from "./types.mts";
