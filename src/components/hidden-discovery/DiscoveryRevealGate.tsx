"use client";

import { useEffect, useState } from "react";
import { getReadyReveals, type RevealItem } from "@/lib/discovery/reveal";
import { RevealSession } from "./RevealSession";

/**
 * Mounted on the customer Dashboard. On return, it quietly checks whether the
 * system noticed anything; if so, it waits ~3 seconds (per the Constitution's
 * "return → idle → reveal") and then opens a Reveal Session. Silent when there
 * is nothing to reveal.
 */
export function DiscoveryRevealGate() {
  const [items, setItems] = useState<RevealItem[] | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    getReadyReveals()
      .then((ready) => {
        if (cancelled || ready.length === 0) return;
        setItems(ready);
        timer = setTimeout(() => {
          if (!cancelled) setShow(true);
        }, 3000);
      })
      .catch(() => {
        // discoveries are a delight layer — never surface an error
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!show || !items) return null;
  return (
    <RevealSession
      items={items}
      onDone={() => {
        setShow(false);
        setItems(null);
      }}
    />
  );
}
