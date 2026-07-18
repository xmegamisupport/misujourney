"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useMyTodayContent } from "@/lib/cms/hooks";
import { completeTodayContent } from "@/lib/cms/engine";
import { TEMPLATE_LIST } from "@/lib/cms/templates";
import type { TodayContentItem } from "@/lib/cms/types";
import { LearningContentModal } from "./LearningContentModal";

/** "今日小知识" — a daily Journey task on the Dashboard. One card, one piece of
 * content, ~30秒~1分钟. After completion it does NOT disappear: it flips to a
 * completed state that stays tappable, so today's content can be reopened for
 * review (completed ≠ hidden). Empty when the day has nothing scheduled. */
export function TodayContentCard() {
  const router = useRouter();
  const { user } = useAuthUser();
  const { data: journey } = useJourneySummary(user?.id ?? "");
  const { data: items, loading, refresh } = useMyTodayContent();
  const [viewItem, setViewItem] = useState<TodayContentItem | null>(null);
  const [viewMode, setViewMode] = useState<"complete" | "review">("complete");
  const [completing, setCompleting] = useState(false);

  if (loading) return null;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-700">📚 今日小知识</p>
        <p className="text-sm text-slate-400">今天没有新的小知识，继续完成你的 Journey 任务就好。</p>
      </div>
    );
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

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">📚 今日小知识</p>
        {items[0].totalToday > 1 && (
          <span className="text-xs text-slate-400">今日内容 {completedCount}/{items[0].totalToday}</span>
        )}
      </div>

      {!current ? (
        // All done — stays visible AND reopenable for review (never removed).
        <button
          type="button"
          onClick={() => open(items[0], "review")}
          className="flex w-full items-center gap-3 rounded-xl bg-emerald-50 p-3 text-left transition hover:bg-emerald-100/70"
        >
          <span className="text-xl">✅</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-700">今日已完成</p>
            <p className="text-xs text-emerald-600/70">点这里可以再看一次今天的内容</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-emerald-600">查看 →</span>
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 text-2xl">
            {current.coverImageUrl || current.posterMedia[0]?.fileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.coverImageUrl ?? current.posterMedia[0].fileUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              template?.icon ?? "🖼️"
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{current.title}</p>
            <p className="text-xs text-slate-400">约 {current.estimatedSeconds} 秒</p>
          </div>
          <button
            type="button"
            onClick={() => open(current, "complete")}
            className="shrink-0 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
          >
            开始看看
          </button>
        </div>
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
    </div>
  );
}
