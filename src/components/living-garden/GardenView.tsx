"use client";

import { useState } from "react";
import { GardenScene } from "@/components/living-garden/GardenScene";
import { GardenHud, type GardenSheetKey } from "@/components/living-garden/GardenHud";
import { GardenSheet, GardenSheetPlaceholder } from "@/components/living-garden/GardenSheet";
import { FounderPreviewBar } from "@/components/living-garden/FounderPreviewBar";
import { useGardenPreview, useGardenState } from "@/lib/living-garden/hooks";
import type { GardenChapter } from "@/lib/living-garden/types";

/** Stage 2: Immersion — the garden itself.
 *
 * Unchanged from Sprint 3: same GardenScene, HUD, bottom sheets, layer engine
 * and founder preview. The only additions the book entrance required are the
 * chapter it plays (so a future Chapter II drops in here untouched), the day it
 * opens on (the customer's real progress), and one small ‹ control back to the
 * book. GardenScene and GardenHud themselves are not modified. */
export function GardenView({ chapter, initialDay, onBack }: { chapter: GardenChapter; initialDay: number; onBack: () => void }) {
  const preview = useGardenPreview(chapter, initialDay);
  const state = useGardenState(preview.day, chapter);
  const [sheet, setSheet] = useState<GardenSheetKey | null>(null);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="relative h-full w-full">
        <GardenScene state={state} />

        {/* Back to the book — the only new chrome, kept as quiet as the HUD so
            the garden stays the main character. */}
        <button
          type="button"
          aria-label="返回书本"
          onClick={onBack}
          className="absolute left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-base shadow-sm backdrop-blur transition active:scale-95"
        >
          ‹
        </button>

        <GardenHud onOpen={setSheet} />

        <GardenSheet open={sheet === "points"} title="⭐ Journey Points" onClose={() => setSheet(null)}>
          <GardenSheetPlaceholder emoji="⭐" line="你累积的 Journey Points 会在这里出现 —— 就在你的花园里，而不是另一个页面。" />
        </GardenSheet>
        <GardenSheet open={sheet === "badges"} title="🏅 徽章" onClose={() => setSheet(null)}>
          <GardenSheetPlaceholder emoji="🏅" line="你在旅程里达成的时刻，之后会变成一枚枚徽章，收藏在这里。" />
        </GardenSheet>
        <GardenSheet open={sheet === "rewards"} title="🎁 奖励" onClose={() => setSheet(null)}>
          <GardenSheetPlaceholder emoji="🎁" line="用 Journey Points 兑换的奖励，之后会放在这里。" />
        </GardenSheet>
        <GardenSheet open={sheet === "more"} title="☰ 更多" onClose={() => setSheet(null)}>
          <GardenSheetPlaceholder emoji="🌱" line="花园的更多设定与说明，之后会放在这里。" />
        </GardenSheet>

        <FounderPreviewBar controller={preview} />
      </div>
    </div>
  );
}
