"use client";

import { useState } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { LIVING_GARDEN_CHAPTERS } from "@/lib/living-garden/chapters";
import { LivingGardenBook } from "@/components/living-garden/LivingGardenBook";
import { GardenView } from "@/components/living-garden/GardenView";

/** Living Garden — Sprint 3.1 entrance.
 *
 * Two emotional stages, and the book restores the first one:
 *   Stage 1 — Wonder ("what worlds are waiting for me?") — the book
 *   Stage 2 — Immersion ("this is my own garden") — the garden scene
 *
 * The page is only the switch between them. Which chapter opens, and the day it
 * opens on, are decided here and handed to the unchanged GardenView; everything
 * about how the garden renders lives in the Sprint 3 framework and is untouched. */
export default function LivingGardenPage() {
  const { user } = useAuthUser();
  const { data: journey } = useJourneySummary(user?.id ?? "");
  const currentDay = journey?.currentDay ?? null;

  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const open = LIVING_GARDEN_CHAPTERS.find((c) => c.id === openChapterId && c.content);

  if (open?.content) {
    const day = Math.max(1, Math.min(open.totalDays, currentDay ?? 1));
    return <GardenView chapter={open.content} initialDay={day} onBack={() => setOpenChapterId(null)} />;
  }

  return <LivingGardenBook currentDay={currentDay} onOpen={setOpenChapterId} />;
}
