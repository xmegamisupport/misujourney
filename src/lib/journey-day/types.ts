export type JourneyDayStatus = "waiting_for_morning" | "active" | "completed";
export type StartMethod = "morning_weight" | "skipped_morning_weight" | "admin_created";
export type MorningWeightStatus = "pending" | "completed" | "skipped";

export interface JourneyDay {
  id: string;
  customerId: string;
  journeyDate: string;
  status: JourneyDayStatus;
  startedAt: string | null;
  startMethod: StartMethod | null;
  morningWeightStatus: MorningWeightStatus;
}
