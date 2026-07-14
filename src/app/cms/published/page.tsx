"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentCardViewer } from "@/components/cms/ContentCardViewer";
import { PosterCardViewer } from "@/components/cms/PosterCardViewer";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { usePublishedContent, useSchedule } from "@/lib/cms/hooks";
import { setContentPublished } from "@/lib/cms/engine";
import { CATEGORY_LABELS, CREATION_MODE_LABELS, CREATION_MODE_STYLES } from "@/lib/cms/types";
import { TEMPLATE_LIST } from "@/lib/cms/templates";
import type { CmsContentItem } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

export default function PublishedContentPage() {
  const { user } = useAuthUser();
  const isAdmin = user?.role === "admin";
  const { data: items, loading, refresh } = usePublishedContent();
  const { data: schedule } = useSchedule();
  const [previewItem, setPreviewItem] = useState<CmsContentItem | null>(null);

  const scheduledDays = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const entry of schedule) {
      const list = map.get(entry.contentId) ?? [];
      list.push(entry.dayNumber);
      map.set(entry.contentId, list);
    }
    return map;
  }, [schedule]);

  async function handleUnpublish(id: string) {
    const result = await setContentPublished(id, false);
    if (result.ok) refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="已发布" subtitle={`共 ${items.length} 篇上线中`} />

      {!loading && items.length === 0 ? (
        <EmptyState icon="✅" title="目前还没有已发布的内容" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => {
            const template = TEMPLATE_LIST.find((t) => t.type === item.templateType);
            const thumbnail = item.coverImageUrl ?? item.posterMedia[0]?.fileUrl ?? null;
            const days = scheduledDays.get(item.id);
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-xl">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (template?.icon ?? "🖼️")
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    {CATEGORY_LABELS[item.category]} · {item.contentCreationMode === "poster_upload" ? "海报上传" : template?.label}
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", CREATION_MODE_STYLES[item.contentCreationMode])}>
                      {CREATION_MODE_LABELS[item.contentCreationMode]}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    建立者：{item.createdByName ?? "—"} · 发布于 {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("zh-CN") : "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">Journey 安排：{days && days.length > 0 ? `Day ${days.join(", ")}` : "尚未安排"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-emerald-300"
                    >
                      预览
                    </button>
                    {isAdmin && (
                      <>
                        <Link href={`/cms/content/${item.id}`} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-emerald-300">
                          编辑
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleUnpublish(item.id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-rose-500 hover:border-rose-300"
                        >
                          取消发布
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPreviewItem(null)}>
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">内容预览</p>
              <button type="button" onClick={() => setPreviewItem(null)} className="text-slate-400">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="mb-3 text-center text-xs font-medium text-slate-400">今日小知识</p>
              <p className="mb-4 text-center text-base font-semibold text-slate-900">{previewItem.title}</p>
              {previewItem.contentCreationMode === "poster_upload" ? (
                <PosterCardViewer media={previewItem.posterMedia} description={previewItem.posterDescription} altText={previewItem.posterAltText} onComplete={() => setPreviewItem(null)} />
              ) : (
                <ContentCardViewer templateType={previewItem.templateType!} fields={previewItem.fields} imageSize="lg" onComplete={() => setPreviewItem(null)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
