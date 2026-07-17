"use client";

import { useState } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCoachApplications } from "@/lib/coach-application/hooks";
import { deriveCardState, submitCoachApplication, withdrawCoachApplication } from "@/lib/coach-application/engine";
import { STATUS_LABEL, STATUS_STYLE, formatApplicationNumber } from "@/lib/coach-application/types";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
}

const REFERRAL_PATTERN = /^[a-z0-9]{3,20}$/;

function ApplicationForm({
  initialUsername,
  onClose,
  onSubmitted,
}: {
  initialUsername: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const normalized = username.trim().toLowerCase();
    if (!REFERRAL_PATTERN.test(normalized)) {
      setError("Reseller Username 只能是 3-20 位英文字母或数字");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await submitCoachApplication(normalized);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "提交失败，请重试");
      return;
    }
    onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <p className="text-lg font-semibold text-slate-900">申请成为 Journey Coach</p>
        <p className="mt-1 text-sm text-slate-500">请填写你公司现有的 Reseller Username。我们的客服团队会先核实，再为你开通教练权限。</p>

        <label className="mt-4 flex flex-col gap-1.5 text-sm text-slate-600">
          Reseller Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="例如 eling"
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <span className="text-[11px] text-slate-400">3-20 位英文字母或数字。</span>
        </label>

        {error && <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {submitting ? "提交中..." : "提交申请"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function JourneyCoachCard() {
  const { user } = useAuthUser();
  const { data: applications, loading, refresh } = useMyCoachApplications();
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (loading || !user) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">🌿 Journey Coach</p>
        <p className="mt-2 text-xs text-slate-400">加载中...</p>
      </div>
    );
  }

  const state = deriveCardState(user.isCoach, applications);

  function openForm(initial: string) {
    setFormInitial(initial);
    setActionError(null);
    setFormOpen(true);
  }

  async function handleWithdraw() {
    if (!state.application) return;
    setWithdrawing(true);
    setActionError(null);
    const result = await withdrawCoachApplication(state.application.id);
    setWithdrawing(false);
    setConfirmWithdraw(false);
    if (!result.ok) {
      setActionError(result.error ?? "撤回失败，请重试");
      return;
    }
    refresh();
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">🌿 Journey Coach</p>
        {applications.length > 0 && (
          <button type="button" onClick={() => setHistoryOpen((v) => !v)} className="text-xs font-medium text-slate-400 hover:text-slate-600">
            申请历史 {historyOpen ? "▲" : "▼"}
          </button>
        )}
      </div>

      <div className="mt-3">
        {state.kind === "not_applied" && (
          <>
            <p className="text-sm text-slate-600">想要带领更多顾客走过他们的 Journey？</p>
            <p className="mt-1 text-sm text-slate-500">申请成为 Journey Coach，审核通过后即可解锁教练工作台。</p>
            <button
              type="button"
              onClick={() => openForm("")}
              className="mt-4 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              申请成为 Journey Coach
            </button>
          </>
        )}

        {state.kind === "pending" && state.application && (
          <>
            <dl className="grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-slate-400">Reseller Username</dt>
              <dd className="col-span-2 font-medium text-slate-800">{state.application.resellerUsername}</dd>
              <dt className="text-slate-400">提交时间</dt>
              <dd className="col-span-2 text-slate-600">{formatDateTime(state.application.submittedAt)}</dd>
              <dt className="text-slate-400">状态</dt>
              <dd className="col-span-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE.pending)}>{STATUS_LABEL.pending}</span>
              </dd>
            </dl>
            <button
              type="button"
              onClick={() => setConfirmWithdraw(true)}
              className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              撤回申请
            </button>
          </>
        )}

        {state.kind === "approved" && (
          <>
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE.approved)}>Coach Active</span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-slate-400">Reseller Username</dt>
              <dd className="col-span-2 font-medium text-slate-800">{state.application?.resellerUsername ?? user.referralCode ?? "—"}</dd>
              {state.application?.reviewedAt && (
                <>
                  <dt className="text-slate-400">通过时间</dt>
                  <dd className="col-span-2 text-slate-600">{formatDateTime(state.application.reviewedAt)}</dd>
                </>
              )}
            </dl>
            <a
              href="/coach"
              className="mt-4 block w-full rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              前往教练工作台 →
            </a>
          </>
        )}

        {state.kind === "rejected" && state.application && (
          <>
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              <p className="font-medium">申请未通过</p>
              <p className="mt-0.5">{state.application.rejectReason ?? "—"}</p>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-slate-400">上次填写</dt>
              <dd className="col-span-2 font-medium text-slate-800">{state.application.resellerUsername}</dd>
            </dl>
            <button
              type="button"
              onClick={() => openForm(state.application!.resellerUsername)}
              className="mt-4 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              重新提交
            </button>
          </>
        )}

        {actionError && <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-600">{actionError}</p>}
      </div>

      {historyOpen && applications.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3">
          {applications.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">{formatApplicationNumber(a.applicationNumber)}</span>
                <span className={cn("rounded-full px-2 py-0.5 font-medium", STATUS_STYLE[a.status])}>{STATUS_LABEL[a.status]}</span>
              </div>
              <p className="mt-1 text-slate-500">Username：{a.resellerUsername}</p>
              <p className="text-slate-400">提交：{formatDateTime(a.submittedAt)}</p>
              {a.reviewedAt && <p className="text-slate-400">审核：{formatDateTime(a.reviewedAt)}</p>}
              {a.status === "rejected" && a.rejectReason && <p className="mt-0.5 text-rose-500">原因：{a.rejectReason}</p>}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <ApplicationForm
          initialUsername={formInitial}
          onClose={() => setFormOpen(false)}
          onSubmitted={() => {
            setFormOpen(false);
            refresh();
          }}
        />
      )}

      {confirmWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-xl">
            <p className="text-base font-semibold text-slate-900">撤回申请</p>
            <p className="mt-2 text-sm text-slate-500">确定要撤回这份申请吗？撤回后你可以立即重新提交。</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmWithdraw(false)} className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                取消
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
              >
                {withdrawing ? "撤回中..." : "确认撤回"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
