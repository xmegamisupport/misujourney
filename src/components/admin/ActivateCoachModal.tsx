"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AdminUserRow } from "@/lib/admin/users";

const REFERRAL_PATTERN = /^[a-z0-9]{3,20}$/;

/** Admin-only. Activates the Coach capability on an EXISTING account — a pure
 * capability grant. It never converts the account or touches role / coach_id /
 * onboarding / Journey data (enforced by admin_set_coach_access). The Reseller
 * Username is required on first activation and locked (confirm-only) if the
 * account already has one. */
export function ActivateCoachModal({ user, onClose, onActivated }: { user: AdminUserRow; onClose: () => void; onActivated: () => void }) {
  const hasExistingCode = !!user.referralCode;
  const [code, setCode] = useState(user.referralCode ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setError(null);
    const normalized = code.trim().toLowerCase();
    if (!hasExistingCode && !REFERRAL_PATTERN.test(normalized)) {
      setError("Reseller Username 只能是 3-20 位英文字母或数字");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    // When a code already exists it is confirm-only (pass null → the RPC keeps
    // the permanent one). On first activation, pass the entered code. The RPC
    // enforces the immutable rule + uniqueness server-side.
    const { error: rpcError } = await supabase.rpc("admin_set_coach_access", {
      p_user_id: user.id,
      p_enabled: true,
      p_referral_code: hasExistingCode ? undefined : normalized,
    });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onActivated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <p className="text-lg font-semibold text-slate-900">开通教练权限</p>
        <p className="mt-1 text-sm text-slate-500">为该账号开通教练工作台。不会改动其顾客 Journey、目标或数据。</p>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
          <p className="font-medium text-slate-800">{user.name}</p>
          <p className="text-slate-500">{user.email ?? "—"}</p>
        </div>

        <label className="mt-4 flex flex-col gap-1.5 text-sm text-slate-600">
          Reseller Username（推荐码）
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            readOnly={hasExistingCode}
            placeholder="例如 eling"
            className={cn(
              "rounded-xl border px-3.5 py-2.5 text-sm outline-none transition",
              hasExistingCode ? "border-slate-200 bg-slate-100 text-slate-500" : "border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
            )}
          />
          <span className="text-[11px] text-slate-400">
            {hasExistingCode
              ? "该账号已有固定的 Reseller Username，开通时不可更改。"
              : "填写公司现有的 Reseller Username（3-20 位英文/数字），开通后不可更改。"}
          </span>
        </label>

        {error && <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            取消
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={submitting}
            className="rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
          >
            {submitting ? "开通中..." : "开通教练"}
          </button>
        </div>
      </div>
    </div>
  );
}
