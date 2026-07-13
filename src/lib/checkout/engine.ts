"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { BowelMovementLevel, CheckoutEngineResult, EveningCheckout, SpecialCondition } from "./types";

type CheckoutRow = Database["public"]["Tables"]["daily_evening_checkouts"]["Row"];

function mapCheckoutRow(row: CheckoutRow): EveningCheckout {
  return {
    id: row.id,
    customerId: row.customer_id,
    checkoutDate: row.checkout_date,
    bowelMovement: row.bowel_movement,
    specialConditions: (row.special_conditions ?? []) as SpecialCondition[],
    notes: row.notes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function getCheckoutForDate(customerId: string, date: string): Promise<EveningCheckout | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_evening_checkouts")
    .select("*")
    .eq("customer_id", customerId)
    .eq("checkout_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCheckoutRow(data) : undefined;
}

export interface SubmitEveningCheckoutInput {
  customerId: string;
  date: string;
  bowelMovement: BowelMovementLevel;
  specialConditions: SpecialCondition[];
  notes?: string;
}

/** Insert-only — a day's checkout is immutable once submitted ("一个日期只
 * 能建立一笔记录"). The insert policy also rejects any date outside
 * [yesterday, today] server-side, so this can't be used to backfill further
 * than one missed day even if a stale client tries. */
export async function submitEveningCheckout(input: SubmitEveningCheckoutInput): Promise<CheckoutEngineResult<EveningCheckout>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_evening_checkouts")
    .insert({
      customer_id: input.customerId,
      checkout_date: input.date,
      bowel_movement: input.bowelMovement,
      special_conditions: input.specialConditions,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: mapCheckoutRow(data) };
}
