import type { DailyCheckIn, InventoryTransaction } from "@/lib/inventory/types";
import type { EveningCheckout } from "@/lib/checkout/types";
import type { BodyProgressRecord } from "@/lib/bodyProgress/types";
import type { ParticipationSignal } from "./workspace-types";

/** MISU-Journey-specific adapter: maps real MISU data into the generic
 * ParticipationSignal shape the consistency engine consumes. The engine
 * itself never imports anything MISU-specific — a future Hair/Skincare
 * Journey would ship its own adapter (Hair Wash Log, Tonic Usage, …) with
 * no change to consistency.ts.
 *
 * "Meaningful participation" for MISU Journey = morning check-in, evening
 * reflection, MISU usage (a MEAL_USAGE inventory transaction), and Body
 * Progress. No fixed dosage is assumed — these are participation events,
 * not a consumption target. */
export function buildMisuParticipationSignals(inputs: {
  checkIns: DailyCheckIn[];
  checkouts: EveningCheckout[];
  transactions: InventoryTransaction[];
  bodyProgress: BodyProgressRecord[];
}): ParticipationSignal[] {
  const misuUsageDates = inputs.transactions
    .filter((t) => t.type === "MEAL_USAGE")
    .map((t) => t.createdAt.slice(0, 10));

  return [
    { type: "morning_checkin", activityDates: inputs.checkIns.map((c) => c.date) },
    { type: "evening_reflection", activityDates: inputs.checkouts.map((c) => c.checkoutDate) },
    { type: "misu_usage", activityDates: misuUsageDates },
    { type: "body_progress", activityDates: inputs.bodyProgress.map((b) => b.submittedAt.slice(0, 10)) },
  ];
}
