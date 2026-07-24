/**
 * Hidden Discovery Engine — pure types.
 *
 * No runtime dependencies (no React, no Supabase) so every consumer here is
 * unit-testable with `node --test`. The engine reads trigger CONDITIONS from the
 * Registry (single source of truth) and evaluates them against a per-user
 * SnapshotContext produced server-side; it never hardcodes an individual
 * discovery.
 */

/** Canonical trigger vocabulary the engine dispatches on. */
export type TriggerType =
  | "first_time"
  | "consecutive_days"
  | "accumulated_count"
  | "calendar_condition"
  | "goal_achievement"
  | "journey_completion"
  | "weight_delta"
  | "comeback"
  | "custom";

/** Signal keys the snapshot can carry. */
export type SignalKey =
  | "weighin"
  | "water"
  | "daily_complete"
  | "meal"
  | "meal_balanced"
  | "reflection";

export type UnlockScope = "lifetime" | "per_journey" | "per_stage" | "repeatable";

/** One discovery as the engine sees it — normalized from the Registry. */
export interface DiscoveryDef {
  id: string; // == registry id == catalogue code
  name: string;
  icon: string;
  description: string;
  category: string;
  rarity: string;
  celebrationType: string;
  triggerType: TriggerType;
  condition: Record<string, unknown>;
  unlockScope: UnlockScope;
  enabled: boolean;
  registryVersion: string;
}

/** A signal's qualifying days (journey dates, already on the 04:00 boundary). */
export interface SignalData {
  /** Unique qualifying journey dates, ascending, `YYYY-MM-DD`. */
  dates: string[];
  /** Count of unique qualifying days (== dates.length, kept explicit). */
  count: number;
  /** Optional local times per record — only weigh-ins carry these. */
  times?: { date: string; localTime: string }[];
}

/** Everything the evaluators need about one user, at one moment. */
export interface SnapshotContext {
  timezone: string;
  /** The moment the triggering event occurred (for "as of" streak math). */
  occurredAt: Date;
  signals: Partial<Record<SignalKey, SignalData>>;
  weight: { baselineKg: number | null; currentKg: number | null };
  goal: { stage: number | null; targetMaxKg: number | null };
  journey: { days: number | null; currentDay: number | null; completed: boolean };
  /** Raw event payload, when a trigger wants to read it directly. */
  payload?: Record<string, unknown>;
}

/** Result of evaluating one discovery. */
export interface EvalResult {
  met: boolean;
  /** false ⇒ the engine cannot evaluate this trigger with current data. */
  supported: boolean;
  reason?: string;
  evidence?: Record<string, unknown>;
}

/** A newly-unlocked discovery, shaped for future UI (returned by the RPC). */
export interface NewUnlock {
  discoveryId: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  category?: string;
  celebrationType: string;
  unlockedAt: string;
  queueId: string | null;
  evidence?: unknown;
}

/** The structured contract returned after evaluating one event. */
export interface EngineResult {
  event: string;
  evaluatedDiscoveryIds: string[];
  newUnlocks: NewUnlock[];
  alreadyUnlocked: string[];
  unsupported: { discoveryId: string; reason: string }[];
  errors: string[];
}
