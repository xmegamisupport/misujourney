"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCoachProfile, useMyCustomers } from "@/lib/coach/hooks";

function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}

export default function CoachReferralPage() {
  const { user } = useAuthUser();
  const coachId = user?.id ?? "";
  const { data: coach } = useMyCoachProfile(coachId);
  const { data: customers } = useMyCustomers(coachId);
  const [copied, setCopied] = useState(false);
  const link = `misujourney.vercel.app/register?ref=${coach?.referralCode ?? ""}`;

  const newThisMonth = useMemo(() => customers.filter((c) => isThisMonth(c.startDate)).length, [customers]);
  const recentJoins = useMemo(
    () => [...customers].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "")).slice(0, 3),
    [customers],
  );

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="我的 Referral" subtitle="邀请新顾客加入你的旅程" />

      <div className="flex flex-col items-center gap-3 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50 p-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
          {coach?.avatar ?? "🌿"}
        </span>
        <p className="text-sm text-slate-500">你的专属 Referral Code</p>
        <p className="text-2xl font-semibold tracking-widest text-slate-900">{coach?.referralCode ?? "—"}</p>

        {coach?.referralCode && (
          <div className="mt-2 flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="flex-1 truncate text-left text-sm text-slate-500">{link}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(`https://${link}`).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="shrink-0 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600"
            >
              {copied ? "已复制 ✓" : "复制链接"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="绑定顾客总数" value={customers.length} unit="位" icon="🔗" accent="bg-sky-50 text-sky-600" />
        <StatCard label="本月新增" value={newThisMonth} unit="位" icon="✨" accent="bg-emerald-50 text-emerald-600" />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">最近加入的顾客</p>
        {recentJoins.length === 0 ? (
          <EmptyState icon="🔗" title="还没有顾客通过你的推荐码加入" />
        ) : (
          <div className="flex flex-col gap-2">
            {recentJoins.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-lg">{c.avatar ?? "🙂"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.startDate ? `加入于 ${c.startDate}` : "加入日期未知"}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">已加入</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
