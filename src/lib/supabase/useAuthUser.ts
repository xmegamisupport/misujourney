"use client";

import { useEffect, useState } from "react";
import { createClient } from "./client";
import type { Enums } from "./database.types";

export interface AuthUser {
  id: string;
  role: Enums<"user_role">;
  name: string;
  /** Referral code captured at sign-up (user_metadata) — the customer→coach
   * binding source carried through email confirmation into onboarding. */
  referralCode: string | null;
  /** Phone captured at registration — onboarding passes it straight back to
   * complete_registration_goals so it is preserved, not re-asked. */
  phone: string | null;
  /** Admin-granted Coach capability (independent of role). */
  isCoach: boolean;
  /** When the one-time Coach welcome was acknowledged (null = not yet). */
  coachWelcomeAckAt: string | null;
}

/** The real authenticated user + profile, for pages that need the actual
 * customer/coach id behind RLS-scoped inventory calls. Proxy already gates
 * /customer, /coach, /admin to a signed-in user of the matching role before
 * these pages render, so `user` is expected to be non-null once loading
 * settles — treat a null result as an edge case (session expired mid-visit),
 * not the common path. */
export function useAuthUser(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(async ({ data: { user: authUser } }) => {
        if (!authUser) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, name, phone, is_coach, coach_welcome_ack_at")
          .eq("id", authUser.id)
          .single();
        if (!cancelled && profile) {
          const referralCode = typeof authUser.user_metadata?.referral_code === "string" ? authUser.user_metadata.referral_code : null;
          setUser({
            id: authUser.id,
            role: profile.role,
            name: profile.name,
            referralCode,
            phone: profile.phone,
            isCoach: profile.is_coach,
            coachWelcomeAckAt: profile.coach_welcome_ack_at,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
