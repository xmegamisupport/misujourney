"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { initializeInventoryFromRegistration } from "@/lib/inventory/engine";
import { UNITS_PER_BOX } from "@/lib/inventory/constants";
import { parseNonNegativeInt } from "@/lib/inventory/validation";

const PENDING_INVENTORY_KEY = "misu_pending_inventory_init";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [boxesN, setBoxesN] = useState("0");
  const [boxesDX, setBoxesDX] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const parsedN = parseNonNegativeInt(boxesN);
  const parsedDX = parseNonNegativeInt(boxesDX);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("请输入姓名");
      return;
    }
    if (!email.trim() || !password) {
      setError("请输入邮箱和密码");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 位");
      return;
    }
    if (parsedN === null || parsedDX === null) {
      setError("购买盒数只能填写 0 或正整数");
      return;
    }
    if (parsedN <= 0 && parsedDX <= 0) {
      setError("至少一项产品的购买盒数必须大于 0");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim(), role: "customer" } },
    });

    if (signUpError) {
      setSubmitting(false);
      if (signUpError.message === "User already registered") {
        setError("该邮箱已被注册，请直接登录");
      } else {
        console.error("Sign up failed:", signUpError);
        setError("注册失败，请稍后再试或联系客服");
      }
      return;
    }

    if (data.session) {
      const result = await initializeInventoryFromRegistration(data.session.user.id, {
        MISU_N_PLUS: parsedN,
        MISU_DX_PLUS: parsedDX,
      });
      setSubmitting(false);
      if (!result.ok) {
        setError(`账号已创建，但初始库存设置失败：${result.error}`);
        return;
      }
      router.push("/customer");
      router.refresh();
      return;
    }

    // Email confirmation required — no session yet. Stash the inventory
    // numbers so the first successful login can complete the setup.
    window.localStorage.setItem(PENDING_INVENTORY_KEY, JSON.stringify({ boxesN: parsedN, boxesDX: parsedDX }));
    setSubmitting(false);
    setPendingConfirmation(true);
  }

  if (pendingConfirmation) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
        <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl mx-auto mb-3">✉️</span>
          <p className="mb-2 text-base font-semibold text-slate-900">请查收确认邮件</p>
          <p className="mb-5 text-sm text-slate-500">我们已发送确认链接到 {email}，确认后即可登录并开始旅程。</p>
          <Link href="/login" className="block w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🌱</span>
          <h1 className="text-xl font-semibold text-slate-900">加入 MISU Journey</h1>
          <p className="text-sm text-emerald-600">Every Day Is A New Journey</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">创建账号</h2>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              姓名
              <input
                type="text"
                placeholder="你的名字"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
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
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="mb-1 text-sm font-semibold text-slate-800">我的 MISU 产品</p>
              <p className="mb-3 text-xs text-slate-500">MISU N+ 代餐 1盒 = 20包 · MISU DX+ 排毒 1盒 = 20包</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-slate-600">
                  MISU N+ 代餐（盒）
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={boxesN}
                    onChange={(e) => setBoxesN(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  <span className="text-[11px] font-medium text-emerald-600">
                    {parsedN !== null ? `= 初始库存 ${parsedN * UNITS_PER_BOX} 包` : "只能填 0 或正整数"}
                  </span>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-slate-600">
                  MISU DX+ 排毒（盒）
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={boxesDX}
                    onChange={(e) => setBoxesDX(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                  <span className="text-[11px] font-medium text-emerald-600">
                    {parsedDX !== null ? `= 初始库存 ${parsedDX * UNITS_PER_BOX} 包` : "只能填 0 或正整数"}
                  </span>
                </label>
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-500">
              <input type="checkbox" required className="mt-0.5" />
              我已阅读并同意《服务条款》与《隐私政策》
            </label>

            {error && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {submitting ? "注册中..." : "注册并开始旅程"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            已经有账号？{" "}
            <Link href="/login" className="font-medium text-emerald-600">
              直接登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
