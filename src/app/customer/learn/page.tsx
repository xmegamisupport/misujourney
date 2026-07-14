"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMyTodayContent } from "@/lib/cms/hooks";
import { completeTodayContent } from "@/lib/cms/engine";
import { ContentCardViewer } from "@/components/cms/ContentCardViewer";

/** Single source of truth: today's content comes entirely from the
 * Knowledge CMS (get_my_today_content()/complete_today_content()) — the
 * same RPCs the dashboard's "今日小知识" card uses, so there's exactly one
 * data path, not a hardcoded course list plus a separate CMS feed. */
export default function LearnPage() {
  const { data: items, loading, refresh } = useMyTodayContent();
  const [completing, setCompleting] = useState(false);

  const current = items.find((i) => !i.completed);
  const allDone = items.length > 0 && !current;

  async function handleComplete() {
    if (!current) return;
    setCompleting(true);
    await completeTodayContent(current.contentId);
    setCompleting(false);
    refresh();
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="今日学习" subtitle="每天一分钟，认识更好的自己" />

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/customer/learn/guide"
          className="flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 transition hover:border-emerald-300"
        >
          <span className="text-2xl">📦</span>
          <p className="text-sm font-semibold text-slate-800">产品使用指南</p>
          <p className="text-xs text-slate-500">了解你的 MISU 产品</p>
        </Link>
        <Link
          href="/customer/learn/faq"
          className="flex flex-col gap-2 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 transition hover:border-sky-300"
        >
          <span className="text-2xl">💬</span>
          <p className="text-sm font-semibold text-slate-800">常见问题</p>
          <p className="text-xs text-slate-500">快速找到答案</p>
        </Link>
      </div>

      {loading ? null : items.length === 0 ? (
        <EmptyState icon="📚" title="今天暂时没有新的小知识，继续完成你的Journey任务就好。" />
      ) : allDone ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-8 text-center">
          <span className="text-3xl">✅</span>
          <p className="text-sm font-medium text-emerald-700">今日内容已完成</p>
        </div>
      ) : (
        current && (
          <div className="flex flex-col gap-3">
            {items[0].totalToday > 1 && (
              <p className="text-center text-xs text-slate-400">
                今日内容 {current.positionInDay} / {current.totalToday}
              </p>
            )}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <ContentCardViewer
                templateType={current.templateType}
                fields={current.fields}
                onComplete={handleComplete}
                completing={completing}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
}
