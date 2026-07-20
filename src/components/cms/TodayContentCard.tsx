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

/** "今日学习" — a daily Journey task on the Dashboard. One card, one piece of
 * content, ~30秒~1分钟.
 *
 * Completed ≠ hidden, and completed ≠ dead: once today is done the card shrinks
 * but stays a door, leading to 学习 — which holds today's lesson, every past
 * one, the guides and the FAQ. A finished task that cannot be tapped teaches
 * the customer that the Dashboard is a checklist rather than a way in. */
export function TodayContentCard({ isNext }: { isNext?: boolean } = {}) {
  const router = useRouter();
  const { user } = useAuthUser();
  const { data: journey } = useJourneySummary(user?.id ?? "");
  const { data: items, loading, refresh } = useMyTodayContent();
  const [viewItem, setViewItem] = useState<TodayContentItem | null>(null);
  const [completing, setCompleting] = useState(false);

  if (loading) return null;

  // Nothing scheduled → nothing outstanding, so it reads as settled (and the
  // Dashboard's X / 5 progress counts it the same way). Still a door: 学习 holds
  // the guides, the FAQ and every past lesson, none of which depend on today
  // having content.
  if (items.length === 0) {
    return <JourneyTaskCard icon="📚" label="今日学习" status="completed" variant="compact" href="/customer/learn" />;
  }

  const current = items.find((i) => !i.completed);
  const template = current ? TEMPLATE_LIST.find((t) => t.type === current.templateType) : undefined;
  const completedCount = items.filter((i) => i.completed).length;

  // The modal now has exactly one job: read today's lesson and mark it done.
  // Re-reading a finished lesson belongs on 学习, not in a Dashboard modal.
  function open(item: TodayContentItem) {
    setViewItem(item);
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
        // Done for today — go to 学习 rather than reopening the lesson in a
        // modal. That page holds today's content AND 学习历史, so it is strictly
        // more than the modal offered, and the Dashboard stays a dashboard.
        <JourneyTaskCard icon="📚" label="今日学习" status="completed" variant="compact" href="/customer/learn" />
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
              onClick={() => open(current)}
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
          onComplete={handleComplete}
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
