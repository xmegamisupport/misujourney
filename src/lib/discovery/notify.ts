/**
 * Client-side dispatch glue for the Hidden Discovery engine.
 *
 * Producers (morning check-in, water, meals, checkout, daily completion) call
 * `notifyDiscoveryEvent(...)` after a successful write. It fire-and-forgets a
 * POST to /api/discovery/events, where the SERVER-side engine actually runs
 * (reading the hidden trigger conditions). This never blocks the producer and
 * never surfaces an error — discoveries are a delight layer.
 */
import { EVENT } from "./engine/events.mts";

export { EVENT };
export type DiscoveryEventName = (typeof EVENT)[keyof typeof EVENT];

export function notifyDiscoveryEvent(eventType: DiscoveryEventName): void {
  if (typeof window === "undefined") return;
  void fetch("/api/discovery/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType }),
    keepalive: true,
  }).catch(() => {
    // swallow — a missed discovery evaluation is self-healing on the next event
  });
}
