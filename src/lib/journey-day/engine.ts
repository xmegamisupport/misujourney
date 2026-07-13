import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { JourneyDay, JourneyDayStatus, MorningWeightStatus, StartMethod } from "./types";

type JourneyDayRow = Database["public"]["Tables"]["daily_journeys"]["Row"];

function mapJourneyDayRow(row: JourneyDayRow): JourneyDay {
  return {
    id: row.id,
    customerId: row.customer_id,
    journeyDate: row.journey_date,
    status: row.status as JourneyDayStatus,
    startedAt: row.started_at,
    startMethod: row.start_method as StartMethod | null,
    morningWeightStatus: row.morning_weight_status as MorningWeightStatus,
  };
}

/** No row for (customerId, date) is the implicit "waiting_for_morning" state
 * — there's no nightly job pre-creating a row for every customer every day. */
export async function getJourneyDayForDate(customerId: string, date: string): Promise<JourneyDay | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_journeys")
    .select("*")
    .eq("customer_id", customerId)
    .eq("journey_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? mapJourneyDayRow(data) : null;
}

export async function skipMorningCheckin(customerId: string, date: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("skip_morning_checkin", { p_customer_id: customerId, p_date: date });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
