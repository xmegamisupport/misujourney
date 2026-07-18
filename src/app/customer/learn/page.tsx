"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useMyTodayContent, useMyLearningHistory } from "@/lib/cms/hooks";
import { completeTodayContent } from "@/lib/cms/engine";
import { TEMPLATE_LIST } from "@/lib/cms/templates";
import { CATEGORY_LABELS, type CmsContentCreationMode, type CmsContentFields, type CmsPosterMediaItem, type CmsTemplateType } from "@/lib/cms/types";
import { LearningContentModal } from "@/components/cms/LearningContentModal";

/** The 学习 centre (bottom-nav 学习) — the single place to learn AND review.
 * Today's content comes from get_my_today_content() (the same feed the Dashboard
 * "今日小知识" task uses); the history section comes from get_my_learning_history()
 * (past unlocked days only — future content is never returned). Completing here
 * writes the same one progress row; completed content stays visible and
 * reopenable for review, because "completed" and "visible" are separate. */

interface ViewerContent {
  title: string;
  subtitle?: string;
  contentCreationMode: CmsContentCreationMode;
  templateType: CmsTemplateType | null;
  fields: CmsContentFields;
  posterMedia: CmsPosterMediaItem[];
  posterDescription: string | null;
  posterAltText: string | null;
  /** contentId when this is today's not-yet-finished item (complete mode);
   * null for read-only review. */
  completeContentId: string | null;
}

function Thumb({ url, icon }: { url: string | null; icon: string }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 text-xl">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        icon
      )}
    </span>
  );
}

export default function LearnPage() {
  const { data: todayItems, loading: todayLoading, refresh: refreshToday } = useMyTodayContent();
  const { data: history, loading: historyLoading, refresh: refreshHistory } = useMyLearningHistory();
  const [viewer, setViewer] = useState<ViewerContent | null>(null);
  const [completing, setCompleting] = useState(false);

  function iconFor(templateType: CmsTemplateType | null): string {
    return TEMPLATE_LIST.find((t) => t.type === templateType)?.icon ?? "🖼️";
  }

  async function handleComplete() {
    if (!viewer?.completeContentId) return;
    setCompleting(true);
    await completeTodayContent(viewer.completeContentId);
    setCompleting(false);
    setViewer(null);
    refreshToday();
    refreshHistory();
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-8 md:px-8">
      <PageHeader title="今日学习" subtitle="每天一分钟，认识更好的自己" />

      {/* Category shortcuts — kept, but they no longer replace the history below. */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/customer/learn/guide" className="flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 transition hover:border-emerald-300">
          <span className="text-2xl">📦</span>
          <p className="text-sm font-semibold text-slate-800">产品使用指南</p>
          <p className="text-xs text-slate-500">了解你的 MISU 产品</p>
        </Link>
        <Link href="/customer/learn/faq" className="flex flex-col gap-2 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 transition hover:border-sky-300">
          <span className="text-2xl">💬</span>
          <p className="text-sm font-semibold text-slate-800">常见问题</p>
          <p className="text-xs text-slate-500">快速找到答案</p>
        </Link>
      </div>

      {/* ── 今日内容 ── */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-700">今日内容</p>
        {todayLoading ? null : todayItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-400 shadow-sm">
            今天暂时没有新的小知识，继续完成你的 Journey 任务就好。
          </div>
        ) : (
          todayItems.map((item) => (
            <button
              key={item.contentId}
              type="button"
              onClick={() =>
                setViewer({
                  title: item.title,
                  subtitle: item.totalToday > 1 ? `今日内容 ${item.positionInDay} / ${item.totalToday}` : undefined,
                  contentCreationMode: item.contentCreationMode,
                  templateType: item.templateType,
                  fields: item.fields,
                  posterMedia: item.posterMedia,
                  posterDescription: item.posterDescription,
                  posterAltText: item.posterAltText,
                  completeContentId: item.completed ? null : item.contentId,
                })
              }
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200"
            >
              <Thumb url={item.coverImageUrl ?? item.posterMedia[0]?.fileUrl ?? null} icon={iconFor(item.templateType)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-400">约 {item.estimatedSeconds} 秒 · {CATEGORY_LABELS[item.category]}</p>
              </div>
              {item.completed ? (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">✅ 今日已完成</span>
              ) : (
                <span className="shrink-0 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white">开始看看</span>
              )}
            </button>
          ))
        )}
      </section>

      {/* ── 学习历史 ── */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-700">学习历史</p>
        {historyLoading ? null : history.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-400 shadow-sm">
            这里会收藏你已经解锁过的小知识，方便随时回顾。
          </div>
        ) : (
          history.map((item) => (
            <button
              key={`${item.dayNumber}-${item.contentId}`}
              type="button"
              onClick={() =>
                setViewer({
                  title: item.title,
                  subtitle: `Day ${item.dayNumber}`,
                  contentCreationMode: item.contentCreationMode,
                  templateType: item.templateType,
                  fields: item.fields,
                  posterMedia: item.posterMedia,
                  posterDescription: item.posterDescription,
                  posterAltText: item.posterAltText,
                  completeContentId: null,
                })
              }
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200"
            >
              <Thumb url={item.coverImageUrl ?? item.posterMedia[0]?.fileUrl ?? null} icon={iconFor(item.templateType)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Day {item.dayNumber}</span>
                  <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{CATEGORY_LABELS[item.category]}</p>
              </div>
              {item.completed ? (
                <span className="shrink-0 text-xs font-medium text-emerald-600">已完成 ✓</span>
              ) : (
                <span className="shrink-0 text-xs font-medium text-slate-400">回顾 →</span>
              )}
            </button>
          ))
        )}
      </section>

      {viewer && (
        <LearningContentModal
          title={viewer.title}
          subtitle={viewer.subtitle}
          contentCreationMode={viewer.contentCreationMode}
          templateType={viewer.templateType}
          fields={viewer.fields}
          posterMedia={viewer.posterMedia}
          posterDescription={viewer.posterDescription}
          posterAltText={viewer.posterAltText}
          onClose={() => setViewer(null)}
          onComplete={viewer.completeContentId ? handleComplete : undefined}
          completing={completing}
        />
      )}
    </div>
  );
}
