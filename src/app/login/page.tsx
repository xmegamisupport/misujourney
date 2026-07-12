import Link from "next/link";

export default function LoginPage() {
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
          <form className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              邮箱 / 手机号
              <input
                type="text"
                placeholder="you@example.com"
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              密码
              <input
                type="password"
                placeholder="输入密码"
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-xs font-medium text-emerald-600">
                忘记密码？
              </Link>
            </div>
            <button
              type="button"
              className="mt-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              登录
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            还没有账号？{" "}
            <Link href="/register" className="font-medium text-emerald-600">
              立即注册
            </Link>
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white/60 p-5">
          <p className="mb-3 text-center text-xs font-medium text-slate-400">Demo 快速体验（无需真实登入）</p>
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/customer"
              className="flex flex-col items-center gap-1 rounded-2xl border border-emerald-100 bg-emerald-50/60 py-3 text-xs font-medium text-emerald-700 transition hover:border-emerald-300"
            >
              <span className="text-lg">🌸</span>
              Customer
            </Link>
            <Link
              href="/coach"
              className="flex flex-col items-center gap-1 rounded-2xl border border-sky-100 bg-sky-50/60 py-3 text-xs font-medium text-sky-700 transition hover:border-sky-300"
            >
              <span className="text-lg">🌿</span>
              Coach
            </Link>
            <Link
              href="/admin"
              className="flex flex-col items-center gap-1 rounded-2xl border border-violet-100 bg-violet-50/60 py-3 text-xs font-medium text-violet-700 transition hover:border-violet-300"
            >
              <span className="text-lg">🛡️</span>
              Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
