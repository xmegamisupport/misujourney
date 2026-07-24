/**
 * Hidden Discovery — Inspector endpoint (Phase 4, admin only).
 *
 * GET /api/discovery/inspect?userId=<uuid>  →  full inspection report for that
 * user. Admin-gated twice: a fast role check here, and the DEFINER RPC the
 * inspector calls also refuses non-admins. Not customer-facing.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inspectUserDiscoveries } from "@/lib/discovery/inspector";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const userId = new URL(req.url).searchParams.get("userId") ?? user.id;
  const report = await inspectUserDiscoveries(supabase, userId);
  return NextResponse.json({ ok: true, report });
}
