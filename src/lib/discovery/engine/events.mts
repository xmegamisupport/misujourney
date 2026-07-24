/**
 * Event registry + relevance mapping.
 *
 * When an event fires, the engine evaluates only the discoveries that event
 * could plausibly satisfy — a morning weigh-in never re-checks food discoveries.
 * Relevance is data-driven: a discovery is relevant if the event touches its
 * signal source OR its trigger type.
 */
import type { DiscoveryDef, SignalKey, TriggerType } from "./types.mts";

/** Engine event types (superset of the producers we expect to wire in Phase 4). */
export const EVENT = {
  MORNING_WEIGHT_RECORDED: "MORNING_WEIGHT_RECORDED",
  WATER_PROGRESS_UPDATED: "WATER_PROGRESS_UPDATED",
  WATER_TARGET_COMPLETED: "WATER_TARGET_COMPLETED",
  MEAL_RECORDED: "MEAL_RECORDED",
  DAILY_FOOD_COMPLETED: "DAILY_FOOD_COMPLETED",
  DAILY_REFLECTION_COMPLETED: "DAILY_REFLECTION_COMPLETED",
  HABIT_COMPLETED: "HABIT_COMPLETED",
  DAILY_CHECK_IN_COMPLETED: "DAILY_CHECK_IN_COMPLETED",
  JOURNEY_STARTED: "JOURNEY_STARTED",
  JOURNEY_COMPLETED: "JOURNEY_COMPLETED",
  PERSONAL_GOAL_ACHIEVED: "PERSONAL_GOAL_ACHIEVED",
  WEIGHT_MILESTONE_REACHED: "WEIGHT_MILESTONE_REACHED",
} as const;

export type EventType = (typeof EVENT)[keyof typeof EVENT];

interface Relevance {
  /** Signal-count / streak / first-time / calendar discoveries on these sources. */
  signals: SignalKey[];
  /** Non-signal trigger types this event can satisfy. */
  triggers: TriggerType[];
}

/** What each event can affect. Empty ⇒ nothing wired to that event yet. */
export const EVENT_RELEVANCE: Record<EventType, Relevance> = {
  MORNING_WEIGHT_RECORDED: { signals: ["weighin"], triggers: ["weight_delta", "goal_achievement"] },
  WATER_PROGRESS_UPDATED: { signals: ["water"], triggers: [] },
  WATER_TARGET_COMPLETED: { signals: ["water"], triggers: [] },
  MEAL_RECORDED: { signals: ["meal", "meal_balanced"], triggers: [] },
  DAILY_FOOD_COMPLETED: { signals: ["meal", "meal_balanced"], triggers: [] },
  DAILY_REFLECTION_COMPLETED: { signals: ["reflection"], triggers: [] },
  HABIT_COMPLETED: { signals: [], triggers: [] },
  DAILY_CHECK_IN_COMPLETED: { signals: ["daily_complete"], triggers: ["comeback"] },
  JOURNEY_STARTED: { signals: [], triggers: ["custom"] },
  JOURNEY_COMPLETED: { signals: [], triggers: ["journey_completion"] },
  PERSONAL_GOAL_ACHIEVED: { signals: [], triggers: ["goal_achievement"] },
  WEIGHT_MILESTONE_REACHED: { signals: [], triggers: ["weight_delta"] },
};

export function isKnownEvent(eventType: string): eventType is EventType {
  return Object.prototype.hasOwnProperty.call(EVENT_RELEVANCE, eventType);
}

/** The subset of `defs` an event could unlock (enabled + source/trigger match). */
export function relevantDiscoveries(eventType: EventType, defs: DiscoveryDef[]): DiscoveryDef[] {
  const rel = EVENT_RELEVANCE[eventType];
  if (!rel) return [];
  const signals = new Set<string>(rel.signals);
  const triggers = new Set<string>(rel.triggers);
  return defs.filter((d) => {
    if (!d.enabled) return false;
    const source = typeof d.condition.source === "string" ? d.condition.source : null;
    if (source && signals.has(source)) return true;
    return triggers.has(d.triggerType);
  });
}
