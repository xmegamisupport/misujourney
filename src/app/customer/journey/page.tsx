"use client";

import { useState } from "react";
import { GardenScene } from "@/components/living-garden/GardenScene";
import { GardenHud, type GardenSheetKey } from "@/components/living-garden/GardenHud";
import { GardenSheet, GardenSheetPlaceholder } from "@/components/living-garden/GardenSheet";
import { FounderPreviewBar } from "@/components/living-garden/FounderPreviewBar";
import { useGardenPreview, useGardenState } from "@/lib/living-garden/hooks";

/** Living Garden — Sprint 3 framework shell.
 *
 * Entering the section shows the GARDEN, immediately and almost full-bleed: no
 * menu, no cards, no module grid. The first question a customer asks here must
 * be "what changed in my garden today?", never "what buttons are here?".
 *
 * This is a framework sprint. The day shown is driven by the Founder Preview
 * scrubber, not by real Journey data — wiring the garden to the real Journey
 * day is a later sprint and touches nothing but which number feeds
 * useGardenState. The renderer, the layers, the HUD and the overlays are the
 * deliverable, all proven with placeholder art. */
export default function LivingGardenPage() {
  const preview = useGardenPreview();
  const state = useGardenState(preview.day);
  const [sheet, setSheet] = useState<GardenSheetKey | null>(null);

  return (
    // Break out of the layout's centered padded column so the scene reaches the
    // edges. The scene is tall enough to read as "the whole screen" while the
    // app's own nav stays as chrome around it.
    <div className="-mt-6 h-[calc(100dvh-9rem)] min-h-[520px] overflow-hidden md:mx-0 md:rounded-3xl">
      <div className="relative h-full w-full">
        <GardenScene state={state} />

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
