"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCoachApplicationForAdmin } from "@/lib/coach-application/hooks";
import { approveCoachApplication, rejectCoachApplication, updateApplicationInternalNote } from "@/lib/coach-application/engine";
import { STATUS_LABEL, STATUS_STYLE, formatApplicationNumber } from "@/lib/coach-application/types";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 py-2.5 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function CoachApplicationReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: app, loading, refresh } = useCoachApplicationForAdmin(id);

  // `null` = untouched → fall back to the loaded note; a string = admin edit.
  // Deriving (rather than copying app.internalNote into state via an effect)
  // avoids a set-state-in-effect cascade.
  const [noteEdit, setNoteEdit] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const internalNote = noteEdit ?? app?.internalNote ?? "";

  if (loading) {
    return <div className="px-4 py-10 text-center text-sm text-slate-400 md:px-8">加载中...</div>;
  }
  if (!app) {
    return (
      <div className="flex flex-col gap-4 px-4 py-8 md:px-8">
        <p className="text-sm text-slate-500">找不到该申请。</p>
        <Link href="/admin/coach-applications" className="text-sm font-medium text-violet-600">← 返回申请列表</Link>
      </div>
    );
  }

  const isPending = app.status === "pending";

  async function saveNote() {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result = await updateApplicationInternalNote(app!.id, internalNote);
    setSubmitting(false);
    if (!result.ok) return setError(result.error ?? "保存失败");
    setNotice("内部备注已保存");
    refresh();
  }

  async function handleApprove() {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result = await approveCoachApplication(app!.id, internalNote);
    setSubmitting(false);
    if (!result.ok) return setError(result.error ?? "通过失败");
    setNotice("已通过，教练权限已开通。");
    refresh();
  }

  async function handleReject() {
    if (!rejectReason.trim()) return setError("请填写拒绝原因");
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result = await rejectCoachApplication(app!.id, rejectReason.trim(), internalNote);
    setSubmitting(false);
    if (!result.ok) return setError(result.error ?? "拒绝失败");
    setShowReject(false);
    setNotice("已拒绝，申请人会看到原因。");
    refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader
        title="申请审核"
        subtitle={formatApplicationNumber(app.applicationNumber)}
        action={
          <Link href="/admin/coach-applications" className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
            ← 返回列表
          </Link>
        }
      />

      <div className="flex items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[app.status])}>{STATUS_LABEL[app.status]}</span>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-700">申请人 Applicant</p>
        <Field label="姓名 Name" value={app.applicantName} />
        <Field label="邮箱 Email" value={app.email ?? "—"} />
        <Field label="电话 Phone" value={app.phone ?? "—"} />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-700">申请 Application</p>
        <Field label="Reseller Username" value={app.resellerUsername} />
        <Field label="提交时间 Submitted At" value={formatDateTime(app.submittedAt)} />
        <Field label="当前状态 Current Status" value={STATUS_LABEL[app.status]} />
        {app.reviewedAt && <Field label="审核时间 Reviewed At" value={formatDateTime(app.reviewedAt)} />}
        {app.reviewedByName && <Field label="审核人 Reviewed By" value={app.reviewedByName} />}
        {app.status === "rejected" && app.rejectReason && <Field label="拒绝原因 Reject Reason" value={app.rejectReason} />}
      </div>

      {/* Internal note — Admin-only, never shown to the applicant. */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-amber-800">内部备注 Internal Note（仅管理员可见）</p>
        <textarea
          value={internalNote}
          onChange={(e) => setNoteEdit(e.target.value)}
          rows={2}
          placeholder="例如：Username 已确认 / 等待总部确认"
          className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />
        <button
          type="button"
          onClick={saveNote}
          disabled={submitting}
          className="mt-2 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
        >
          保存备注
        </button>
      </div>

      {error && <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      {isPending && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">审核决定 Review</p>
          {!showReject ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowReject(true)}
                disabled={submitting}
                className="rounded-xl border border-rose-200 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
              >
                拒绝 Reject
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting}
                className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
              >
                {submitting ? "处理中..." : "通过 Approve"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm text-slate-600">
                拒绝原因 Reject Reason（申请人会看到）
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  placeholder="例如：Reseller Username 未找到 / 请联系总部"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setShowReject(false); setRejectReason(""); setError(null); }}
                  className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={submitting}
                  className="rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {submitting ? "处理中..." : "确认拒绝"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
