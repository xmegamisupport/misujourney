import { createClient } from "@/lib/supabase/client";
import type { CoachContact } from "./types";

/** Uses get_my_coach_contact() — a SECURITY DEFINER function that derives
 * the caller's bound coach entirely from their own auth.uid(), with no
 * coach_id parameter, so a customer can never look up any other coach.
 * Returns null when no coach is bound yet (not an error). */
export async function getMyCoachContact(): Promise<CoachContact | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_coach_contact");
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    coachId: row.coach_id,
    name: row.name,
    avatar: row.avatar,
    whatsappNumber: row.whatsapp_number,
  };
}
