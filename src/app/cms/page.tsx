"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useContentLibrary } from "@/lib/cms/hooks";
import { CATEGORY_LABELS, CREATION_MODE_LABELS, CREATION_MODE_STYLES, STATUS_LABELS, STATUS_STYLES } from "@/lib/cms/types";
import type { CmsContentCreationMode, CmsContentStatus } from "@/lib/cms/types";
import { TEMPLATE_LIST } from "@/lib/cms/templates";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: CmsContentStatus[] = ["draft", "pending_review", "needs_revision", "published", "unpublished"];
const CREATION_MODE_FILTERS: CmsContentCreationMode[] = ["template", "poster_upload"];

export default function ContentLibraryPage() {
  const { user } = useAuthUser();
  const { data: items, loading } = useContentLibrary();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<"mode" | "template">("mode");
  const [statusFilter, setStatusFilter] = useState<CmsContentStatus | "all">("all");
  const [creationModeFilter, setCreationModeFilter] = useState<CmsContentCreationMode | "all">("all");
  const canCreate = user?.role === "admin" || user?.role === "nutritionist" || user?.role === "trainer";

  const sorted = useMemo(() => [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [items]);
  const filtered = useMemo(
    () =>
      sorted
        .filter((item) => statusFilter === "all" || item.status === statusFilter)
        .filter((item) => creationModeFilter === "all" || item.contentCreationMode === creationModeFilter),
    [sorted, statusFilter, creationModeFilter],
  );
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, [items]);
  const creationModeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.contentCreationMode] = (counts[item.contentCreationMode] ?? 0) + 1;
    return counts;
  }, [items]);

  function openPicker() {
    setPickerStep("mode");
    setPickerOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="内容库"
        subtitle={`共 ${items.length} 篇内容`}
        action={
          canCreate ? (
            <button
              type="button"
              onClick={openPicker}
              className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
            >
              + 新增内容
            </button>
          ) : undefined
        }
      />

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center" onClick={() => setPickerOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-lg md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            {pickerStep === "mode" ? (
              <>
                <p className="mb-4 text-base font-semibold text-slate-900">请选择建立方式</p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setPickerStep("template")}
                    className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <span className="text-3xl">📝</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">手动建立内容</p>
                      <p className="mt-0.5 text-xs text-slate-500">选择版型，逐一填写标题、分类、内容栏位</p>
                    </div>
                  </button>
                  <Link
                    href="/cms/new/poster"
                    onClick={() => setPickerOpen(false)}
                    className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <span className="text-3xl">🖼️</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">上传已设计好的海报</p>
                      <p className="mt-0.5 text-xs text-slate-500">Designer 已完成视觉设计，只需填写标题、分类并上传图片</p>
                    </div>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setPickerStep("mode")} className="mb-3 text-xs font-medium text-slate-400 hover:text-slate-600">
                  ← 返回
                </button>
                <p className="mb-4 text-base font-semibold text-slate-900">选择内容版型</p>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATE_LIST.map((t) => (
                    <Link
                      key={t.type}
                      href={`/cms/new?template=${t.type}`}
                      onClick={() => setPickerOpen(false)}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <span className="text-3xl">{t.icon}</span>
                      <span className="text-sm font-medium text-slate-700">{t.label}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                statusFilter === "all" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500",
              )}
            >
              全部 ({items.length})
            </button>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                  statusFilter === s ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500",
                )}
              >
                {STATUS_LABELS[s]} ({statusCounts[s] ?? 0})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCreationModeFilter("all")}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                creationModeFilter === "all" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500",
              )}
            >
              全部建立方式
            </button>
            {CREATION_MODE_FILTERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setCreationModeFilter(m)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                  creationModeFilter === m ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500",
                )}
              >
                {CREATION_MODE_LABELS[m]} ({creationModeCounts[m] ?? 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon="📚"
          title={items.length === 0 ? "内容库还是空的" : "这个条件下还没有内容"}
          description={items.length === 0 && canCreate ? "点击右上角「+ 新增内容」建立第一篇" : undefined}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((item) => {
            const template = TEMPLATE_LIST.find((t) => t.type === item.templateType);
            const thumbnail = item.coverImageUrl ?? item.posterMedia[0]?.fileUrl ?? null;
            return (
              <Link
                key={item.id}
                href={`/cms/content/${item.id}`}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 text-xl">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (template?.icon ?? "🖼️")
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.title || "（未命名）"}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {CATEGORY_LABELS[item.category]} · {item.contentCreationMode === "poster_upload" ? "海报上传" : template?.label}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLES[item.status])}>{STATUS_LABELS[item.status]}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", CREATION_MODE_STYLES[item.contentCreationMode])}>
                    {CREATION_MODE_LABELS[item.contentCreationMode]}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
