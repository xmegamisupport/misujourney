"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export interface CoachCustomerSummary {
  id: string;
  name: string;
  avatar: string | null;
  startDate: string | null;
}

export interface CoachCustomerProfile extends CoachCustomerSummary {
  age: number | null;
  height: number | null;
  gender: string | null;
  phone: string | null;
  dietType: Database["public"]["Enums"]["diet_type"] | null;
  activityLevel: Database["public"]["Enums"]["activity_level"] | null;
}

/** RLS (profiles_select_as_coach: coach_id = auth.uid()) already scopes this
 * to exactly the customers assigned to the caller — no extra filtering
 * needed beyond role, since a coach can't see anyone else's profiles here. */
export async function getMyCustomers(coachId: string): Promise<CoachCustomerSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("id, name, avatar, start_date").eq("coach_id", coachId).eq("role", "customer").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, avatar: row.avatar, startDate: row.start_date }));
}

export async function getCustomerProfile(customerId: string): Promise<CoachCustomerProfile | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", customerId).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return {
    id: data.id,
    name: data.name,
    avatar: data.avatar,
    startDate: data.start_date,
    age: data.age,
    height: data.height,
    gender: data.gender,
    phone: data.phone,
    dietType: data.diet_type,
    activityLevel: data.activity_level,
  };
}
