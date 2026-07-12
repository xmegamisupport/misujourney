"use client";

import { useEffect, useState } from "react";
import { createClient } from "./client";
import type { Enums } from "./database.types";

export interface AuthUser {
  id: string;
  role: Enums<"user_role">;
  name: string;
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
        const { data: profile } = await supabase.from("profiles").select("role, name").eq("id", authUser.id).single();
        if (!cancelled && profile) {
          setUser({ id: authUser.id, role: profile.role, name: profile.name });
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
