"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneyBaselineStatus } from "@/lib/baseline/hooks";

function DoneBadge() {
  return <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">已完成 ✓</span>;
}

export default function JourneyStartPage() {
  return (
    <Suspense>
      <JourneyStartContent />
    </Suspense>
  );
}

function JourneyStartContent() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { status } = useJourneyBaselineStatus(customerId);
  const justSaved = useSearchParams().get("saved") === "1";

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="🌱 建立你的 Journey 起点" />

      {justSaved && !status.complete && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          ✓ 已保存，继续完成下面这一项，你的 Journey 起点就完整了。
        </div>
      )}

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 text-sm leading-relaxed text-slate-600">
        <p>未来每一次的改变，都会从今天开始记录。</p>
        <p className="mt-2">为了让未来的你，能够更清楚看见自己的改变，建议先完成以下两件事。</p>
      </div>

      {/* Item 1 — starting photos (reuses Body Progress capture) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">📷 Journey 起点照片</p>
            <p className="mt-1 text-xs text-slate-500">记录 前 / 左 / 右 / 后 四个角度，留下今天的样子。</p>
          </div>
          {status.photosDone && <DoneBadge />}
        </div>
        {status.photosDone ? (
          <Link
            href="/customer/progress/body"
            className="mt-4 block w-full rounded-xl border border-emerald-200 py-2.5 text-center text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
          >
            查看我的起点照片
          </Link>
        ) : (
          <Link
            href="/customer/progress/body/guide?from=baseline"
            className="mt-4 block w-full rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            {status.dataDone ? "继续 · 拍摄起点照片" : "开始拍照"}
          </Link>
        )}
      </div>

      {/* Item 2 — lifestyle baseline */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">📊 了解你的生活习惯</p>
            <p className="mt-1 text-xs text-slate-500">先了解你平常的睡眠、排便与喝水习惯。</p>
          </div>
          {status.dataDone && <DoneBadge />}
        </div>
        <Link
          href="/customer/journey-start/lifestyle"
          className={
            status.dataDone
              ? "mt-4 block w-full rounded-xl border border-emerald-200 py-2.5 text-center text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
              : "mt-4 block w-full rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
          }
        >
          {status.dataDone ? "更新我的生活习惯" : status.photosDone ? "继续 · 了解你的生活习惯" : "开始记录"}
        </Link>
      </div>

      {status.complete ? (
        <Link
          href="/customer"
          className="rounded-xl bg-slate-900 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          起点已建立，进入 Journey →
        </Link>
      ) : (
        <Link href="/customer" className="py-1 text-center text-sm font-medium text-slate-400 transition hover:text-slate-600">
          以后再完成
        </Link>
      )}
    </div>
  );
}
