import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Service-role client — bypasses RLS entirely. Server-only: never import
 * this into a client component, and only call it from routes that have
 * already checked the caller's role themselves (the proxy doesn't cover
 * /api/*, so each route is responsible for its own admin check). */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
