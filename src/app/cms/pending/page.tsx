"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentCardViewer } from "@/components/cms/ContentCardViewer";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { usePendingContent } from "@/lib/cms/hooks";
import { reviewContent } from "@/lib/cms/engine";
import { CATEGORY_LABELS } from "@/lib/cms/types";
import { TEMPLATE_LIST } from "@/lib/cms/templates";
import type { CmsContentItem } from "@/lib/cms/types";

function PendingCard({ item, onDone }: { item: CmsContentItem; onDone: () => void }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedMessage, setPublishedMessage] = useState(false);
  const template = TEMPLATE_LIST.find((t) => t.type === item.templateType);

  async function handlePublish() {
    setBusy(true);
    setError(null);
    const result = await reviewContent(item.id, true);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "操作失败");
      return;
    }
    setPublishedMessage(true);
    setTimeout(onDone, 900);
  }

  async function handleReject() {
    if (!reason.trim()) {
      setError("请填写退回原因");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await reviewContent(item.id, false, reason.trim());
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "操作失败");
      return;
    }
    onDone();
  }

  if (publishedMessage) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
        ✅ 内容已发布。安排到 Journey Day 后，顾客才会看到。
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 text-xl">
          {item.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            template?.icon
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {CATEGORY_LABELS[item.category]} · {template?.label} · 约 {item.estimatedSeconds} 秒
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            建立者：{item.createdByName ?? "—"} · 提交于{" "}
            {item.submittedForReviewAt ? new Date(item.submittedForReviewAt).toLocaleString("zh-CN") : "—"}
          </p>
        </div>
        <button type="button" onClick={() => setPreviewOpen(true)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-300">
          预览
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}

      {!rejecting ? (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={handlePublish} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
            发布
          </button>
          <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600">
            退回修改
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请填写退回原因，让建立者知道要修改什么"
            rows={2}
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={handleReject} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">
              确认退回
            </button>
            <button type="button" onClick={() => setRejecting(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">
              取消
            </button>
          </div>
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPreviewOpen(false)}>
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">内容预览</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="mb-3 text-center text-xs font-medium text-slate-400">今日小知识</p>
              <p className="mb-4 text-center text-base font-semibold text-slate-900">{item.title}</p>
              <ContentCardViewer templateType={item.templateType} fields={item.fields} imageSize="lg" onComplete={() => setPreviewOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PendingReviewPage() {
  const { user } = useAuthUser();
  const { data: items, loading, refresh } = usePendingContent();

  if (!loading && user && user.role !== "admin") {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="待审核" />
        <EmptyState icon="🔒" title="只有 Admin 可以审核内容" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="待审核" subtitle={`共 ${items.length} 篇待审核`} />
      {!loading && items.length === 0 ? (
        <EmptyState icon="🎉" title="目前没有等待审核的内容" />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <PendingCard key={item.id} item={item} onDone={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
