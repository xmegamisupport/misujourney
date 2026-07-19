"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useMyTodayContent } from "@/lib/cms/hooks";
import { completeTodayContent } from "@/lib/cms/engine";
import { TEMPLATE_LIST } from "@/lib/cms/templates";
import type { TodayContentItem } from "@/lib/cms/types";
import { JourneyTaskCard } from "@/components/ui/JourneyTaskCard";
import { LearningContentModal } from "./LearningContentModal";

/** "今日小知识" — a daily Journey task on the Dashboard. One card, one piece of
 * content, ~30秒~1分钟. After completion it does NOT disappear: it flips to a
 * completed state that stays tappable, so today's content can be reopened for
 * review (completed ≠ hidden). Empty when the day has nothing scheduled. */
export function TodayContentCard({ isNext }: { isNext?: boolean } = {}) {
  const router = useRouter();
  const { user } = useAuthUser();
  const { data: journey } = useJourneySummary(user?.id ?? "");
  const { data: items, loading, refresh } = useMyTodayContent();
  const [viewItem, setViewItem] = useState<TodayContentItem | null>(null);
  const [viewMode, setViewMode] = useState<"complete" | "review">("complete");
  const [completing, setCompleting] = useState(false);

  if (loading) return null;

  // Nothing scheduled → nothing outstanding, so it reads as settled (and the
  // Dashboard's X / 5 progress counts it the same way).
  if (items.length === 0) {
    return <JourneyTaskCard icon="📚" label="今日学习" status="completed" variant="compact" />;
  }

  const current = items.find((i) => !i.completed);
  const template = current ? TEMPLATE_LIST.find((t) => t.type === current.templateType) : undefined;
  const completedCount = items.filter((i) => i.completed).length;

  function open(item: TodayContentItem, mode: "complete" | "review") {
    setViewItem(item);
    setViewMode(mode);
  }

  async function handleComplete() {
    if (!viewItem) return;
    setCompleting(true);
    await completeTodayContent(viewItem.contentId);
    setCompleting(false);
    setViewItem(null);
    refresh();
  }

  const multi = items[0].totalToday > 1;

  return (
    <>
      {!current ? (
        // A settled one-time task: compressed to a chip, still tappable so
        // today's content stays reopenable for review.
        <JourneyTaskCard icon="📚" label="今日学习" status="completed" variant="compact" onClick={() => open(items[0], "review")} />
      ) : (
        <JourneyTaskCard
          icon={template?.icon ?? "📚"}
          label="今日学习"
          status="available"
          value={multi ? `${current.title} · ${completedCount}/${items[0].totalToday}` : current.title}
          isNext={isNext}
          actionSlot={
            <button
              type="button"
              onClick={() => open(current, "complete")}
              className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
            >
              开始 →
            </button>
          }
        />
      )}

      {viewItem && (
        <LearningContentModal
          title={viewItem.title}
          dayLabel={
            [
              journey?.currentDay ? `Day ${journey.currentDay}` : null,
              viewItem.totalToday > 1 ? `今日第 ${viewItem.positionInDay} 篇` : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
          contentCreationMode={viewItem.contentCreationMode}
          templateType={viewItem.templateType}
          fields={viewItem.fields}
          posterMedia={viewItem.posterMedia}
          posterDescription={viewItem.posterDescription}
          posterAltText={viewItem.posterAltText}
          onClose={() => setViewItem(null)}
          onComplete={viewMode === "complete" ? handleComplete : undefined}
          completing={completing}
          onOpenHistory={() => {
            // Navigation only — never records or resets a completion. The 学习
            // page stays the single place to review previous content.
            setViewItem(null);
            router.push("/customer/learn?section=history");
          }}
        />
      )}
    </>
  );
}
