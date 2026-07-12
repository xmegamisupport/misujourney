import Link from "next/link";
import { currentCoach } from "@/lib/mock-data";

export default async function ReferralJoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🌱</span>
          <h1 className="text-xl font-semibold text-slate-900">MISU Journey</h1>
          <p className="text-sm text-emerald-600">Every Day Is A New Journey</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-sm text-slate-500">你的朋友邀请你加入 MISU Journey</p>

          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-4xl">
            {currentCoach.avatar}
          </div>
          <p className="text-base font-semibold text-slate-900">{currentCoach.name}</p>
          <p className="mb-4 text-sm text-slate-500">{currentCoach.title}</p>

          <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-xs text-slate-400">Referral Code</span>
            <span className="text-sm font-semibold tracking-wide text-slate-800">{code}</span>
          </div>

          <p className="mb-6 text-sm text-slate-500">
            注册即可绑定 {currentCoach.name} 作为你的专属 Journey Coach，开启属于你的健康旅程。
          </p>

          <Link
            href={`/register?ref=${code}`}
            className="block w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            继续注册
          </Link>
          <p className="mt-4 text-sm text-slate-500">
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
