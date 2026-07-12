"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🌱</span>
          <h1 className="text-xl font-semibold text-slate-900">找回密码</h1>
          <p className="text-sm text-emerald-600">Every Day Is A New Journey</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          {!sent ? (
            <>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">忘记密码</h2>
              <p className="mb-5 text-sm text-slate-500">请输入注册邮箱，我们会发送重设密码链接给你。</p>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-1.5 text-sm text-slate-600">
                  邮箱
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                {error && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                >
                  {submitting ? "发送中..." : "发送重设密码链接"}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl">
                ✉️
              </span>
              <p className="text-sm font-medium text-slate-800">邮件已发送</p>
              <p className="text-sm text-slate-500">请查收邮箱中的重设密码链接，如未收到可检查垃圾邮件夹。</p>
            </div>
          )}
          <p className="mt-5 text-center text-sm text-slate-500">
            <Link href="/login" className="font-medium text-emerald-600">
              返回登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
