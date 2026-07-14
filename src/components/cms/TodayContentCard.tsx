"use client";

import { useState } from "react";
import { useMyTodayContent } from "@/lib/cms/hooks";
import { completeTodayContent } from "@/lib/cms/engine";
import { TEMPLATE_LIST } from "@/lib/cms/templates";
import { ContentCardViewer } from "./ContentCardViewer";

/** "今日小知识" — one card, one piece of content, ~30秒~1分钟. Not shown at
 * all if the day has nothing scheduled (empty-state text, never an error);
 * shows 今日内容 X/Y only once the daily limit is raised above 1. */
export function TodayContentCard() {
  const { data: items, loading, refresh } = useMyTodayContent();
  const [viewerOpen, setViewerOpen] = useState(false);
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

  async function handleComplete() {
    if (!current) return;
    setCompleting(true);
    await completeTodayContent(current.contentId);
    setCompleting(false);
    setViewerOpen(false);
    refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">📚 今日小知识</p>
        {items[0].totalToday > 1 && (
          <span className="text-xs text-slate-400">
            今日内容 {items.filter((i) => i.completed).length}/{items[0].totalToday}
          </span>
        )}
      </div>

      {!current ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
          <span className="text-xl">✅</span>
          <p className="text-sm font-medium text-emerald-700">今日内容已完成</p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 text-2xl">
            {current.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.coverImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              template?.icon
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{current.title}</p>
            <p className="text-xs text-slate-400">约 {current.estimatedSeconds} 秒</p>
          </div>
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            className="shrink-0 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
          >
            开始看看
          </button>
        </div>
      )}

      {viewerOpen && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setViewerOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{current.title}</p>
              <button type="button" onClick={() => setViewerOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            {current.totalToday > 1 && (
              <p className="mb-3 text-center text-xs text-slate-400">
                今日内容 {current.positionInDay} / {current.totalToday}
              </p>
            )}
            <ContentCardViewer templateType={current.templateType} fields={current.fields} onComplete={handleComplete} completing={completing} />
          </div>
        </div>
      )}
    </div>
  );
}
