"use client";

import { useSyncExternalStore } from "react";

function subscribeNoop() {
  return () => {};
}

function getClientHour(): number {
  return new Date().getHours();
}

/** The server has no notion of the customer's local clock, so reading
 * `new Date().getHours()` during render would mismatch between the
 * server-rendered HTML and the client's first paint. Returning null on the
 * server (and during hydration) lets callers decide: use a neutral fallback for
 * cosmetic things like a greeting, or hold a time-gated screen until the real
 * local hour is known so it never flashes the wrong state. */
function getServerHour(): number | null {
  return null;
}

export function useLocalHour(): number | null {
  return useSyncExternalStore(subscribeNoop, getClientHour, getServerHour);
}
