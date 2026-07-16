"use client";

import { createClient } from "@/lib/supabase/client";

export interface ReferralCoach {
  name: string;
  avatar: string | null;
}

/** The Reseller Username IS the referral code — stored lowercased. Normalise
 * user input the same way so a link or a manually-typed code matches
 * regardless of case or surrounding whitespace. */
export function normalizeReferralCode(code: string): string {
  return code.trim().toLowerCase();
}

/** Shape of a referral code we're willing to even look up — mirrors the
 * coach-registration pattern (3–20 lowercase alphanumerics). */
export function isReferralCodeShape(code: string): boolean {
  return /^[a-z0-9]{3,20}$/.test(normalizeReferralCode(code));
}

/** Public, pre-auth lookup used only to IDENTIFY and DISPLAY the Coach behind
 * a referral code. It returns the Coach's public display fields only and never
 * a coach id — the trusted customer→coach binding still happens exclusively in
 * complete_registration_goals() from the code string. Returns null when the
 * code doesn't resolve to a valid Coach. */
export async function lookupCoachByReferral(code: string): Promise<ReferralCoach | null> {
  const normalized = normalizeReferralCode(code);
  if (!isReferralCodeShape(normalized)) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_coach_public_by_referral", { p_code: normalized });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return { name: row.name, avatar: row.avatar ?? null };
}
