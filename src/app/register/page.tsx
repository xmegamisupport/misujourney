"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { currentCustomer } from "@/lib/mock-data";
import { initializeInventoryFromRegistration } from "@/lib/inventory/engine";
import { UNITS_PER_BOX } from "@/lib/inventory/constants";
import { parseNonNegativeInt } from "@/lib/inventory/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [boxesN, setBoxesN] = useState("0");
  const [boxesDX, setBoxesDX] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const parsedN = parseNonNegativeInt(boxesN);
  const parsedDX = parseNonNegativeInt(boxesDX);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (parsedN === null || parsedDX === null) {
      setError("购买盒数只能填写 0 或正整数");
      return;
    }
    if (parsedN <= 0 && parsedDX <= 0) {
      setError("至少一项产品的购买盒数必须大于 0");
      return;
    }

    const result = initializeInventoryFromRegistration(
      currentCustomer.id,
      { MISU_N_PLUS: parsedN, MISU_DX_PLUS: parsedDX },
      "customer",
    );
    if (!result.ok) {
      setError(result.error ?? "初始化库存失败，请重试");
      return;
    }
    router.push("/customer");
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
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              手机号
              <input
                type="text"
                placeholder="+60 1x-xxx xxxx"
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              邮箱
              <input
                type="email"
                placeholder="you@example.com"
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              密码
              <input
                type="password"
                placeholder="设定密码"
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              Referral Code（选填）
              <input
                type="text"
                placeholder="CHLOE688"
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
              <input type="checkbox" className="mt-0.5" />
              我已阅读并同意《服务条款》与《隐私政策》
            </label>

            {error && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
            )}

            <button
              type="submit"
              className="mt-1 rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              注册并开始旅程
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
