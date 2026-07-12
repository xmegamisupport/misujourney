"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { initializeInventoryFromRegistration } from "@/lib/inventory/engine";

const PENDING_INVENTORY_KEY = "misu_pending_inventory_init";
const ROLE_HOME: Record<string, string> = {
  customer: "/customer",
  coach: "/coach",
  admin: "/admin",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("请输入邮箱和密码");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setSubmitting(false);
      setError(signInError.message === "Invalid login credentials" ? "邮箱或密码不正确" : signInError.message);
      return;
    }

    const pending = window.localStorage.getItem(PENDING_INVENTORY_KEY);
    if (pending) {
      try {
        const { boxesN, boxesDX } = JSON.parse(pending) as { boxesN: number; boxesDX: number };
        await initializeInventoryFromRegistration(data.user.id, { MISU_N_PLUS: boxesN, MISU_DX_PLUS: boxesDX });
      } finally {
        window.localStorage.removeItem(PENDING_INVENTORY_KEY);
      }
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    const redirectTo = searchParams.get("redirectTo");
    const home = (profile && ROLE_HOME[profile.role]) || "/customer";

    setSubmitting(false);
    router.push(redirectTo && redirectTo.startsWith("/") ? redirectTo : home);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🌱</span>
          <h1 className="text-xl font-semibold text-slate-900">MISU Journey</h1>
          <p className="text-sm text-emerald-600">Every Day Is A New Journey</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">登录</h2>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              邮箱
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              密码
              <input
                type="password"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-xs font-medium text-emerald-600">
                忘记密码？
              </Link>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {submitting ? "登录中..." : "登录"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            还没有账号？{" "}
            <Link href="/register" className="font-medium text-emerald-600">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
