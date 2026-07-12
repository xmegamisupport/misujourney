"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccountSettingsSection() {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < 6) {
      setError("密码至少需要 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-sm text-slate-700 hover:bg-slate-50"
      >
        <span className="text-lg">⚙️</span>
        <span className="flex-1 text-left">账号设置 · 修改密码</span>
        <span className="text-slate-300">{open ? "︿" : "→"}</span>
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-slate-50 px-4 py-4">
          <label className="flex flex-col gap-1.5 text-xs text-slate-500">
            新密码
            <input
              type="password"
              placeholder="至少 6 位"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-slate-500">
            确认新密码
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          {success && <p className="text-xs text-emerald-600">密码已更新</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "保存中..." : "保存新密码"}
          </button>
        </form>
      )}
    </div>
  );
}
