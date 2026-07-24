/**
 * Hidden Discovery — server-side event endpoint (Phase 3.5).
 *
 * Producers POST `{ eventType }` here after a successful write; this runs the
 * engine server-side with the caller's authenticated session (so unlocks are
 * keyed to auth.uid() and the hidden trigger conditions never reach the
 * browser). Returns only the caller's own new unlocks.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateHiddenDiscoveries } from "@/lib/discovery/engine/index";
import { isKnownEvent } from "@/lib/discovery/engine/events.mts";

export async function POST(req: Request) {
  let body: { eventType?: unknown; occurredAt?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const eventType = body?.eventType;
  if (typeof eventType !== "string" || !isKnownEvent(eventType)) {
    return NextResponse.json({ ok: false, error: "unknown_event" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await evaluateHiddenDiscoveries({
    supabase,
    eventType,
    occurredAt: typeof body.occurredAt === "string" ? body.occurredAt : undefined,
  });

  // Never leak internal errors verbatim; the caller only needs its own unlocks.
  return NextResponse.json({ ok: true, event: result.event, newUnlocks: result.newUnlocks });
}
