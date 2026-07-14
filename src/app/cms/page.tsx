"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useContentLibrary } from "@/lib/cms/hooks";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_STYLES } from "@/lib/cms/types";
import type { CmsContentStatus } from "@/lib/cms/types";
import { TEMPLATE_LIST } from "@/lib/cms/templates";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: CmsContentStatus[] = ["draft", "pending_review", "needs_revision", "published", "unpublished"];

export default function ContentLibraryPage() {
  const { user } = useAuthUser();
  const { data: items, loading } = useContentLibrary();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CmsContentStatus | "all">("all");
  const canCreate = user?.role === "admin" || user?.role === "nutritionist" || user?.role === "trainer";

  const sorted = useMemo(() => [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [items]);
  const filtered = useMemo(() => (statusFilter === "all" ? sorted : sorted.filter((item) => item.status === statusFilter)), [sorted, statusFilter]);
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="内容库"
        subtitle={`共 ${items.length} 篇内容`}
        action={
          canCreate ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
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
            <p className="mb-4 text-base font-semibold text-slate-900">选择内容版型</p>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATE_LIST.map((t) => (
                <Link
                  key={t.type}
                  href={`/cms/new?template=${t.type}`}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <span className="text-3xl">{t.icon}</span>
                  <span className="text-sm font-medium text-slate-700">{t.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {items.length > 0 && (
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
      )}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon="📚"
          title={items.length === 0 ? "内容库还是空的" : "这个状态下还没有内容"}
          description={items.length === 0 && canCreate ? "点击右上角「+ 新增内容」建立第一篇" : undefined}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((item) => {
            const template = TEMPLATE_LIST.find((t) => t.type === item.templateType);
            return (
              <Link
                key={item.id}
                href={`/cms/content/${item.id}`}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl">{template?.icon ?? "📄"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.title || "（未命名）"}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {CATEGORY_LABELS[item.category]} · {template?.label}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLES[item.status])}>{STATUS_LABELS[item.status]}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
