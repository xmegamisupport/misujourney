"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { currentCoach, otherCustomers } from "@/lib/mock-data";

export default function CoachReferralPage() {
  const coach = currentCoach;
  const [copied, setCopied] = useState(false);
  const link = `misujourney.com/join/${coach.referralCode}`;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="我的 Referral" subtitle="邀请新顾客加入你的旅程" />

      <div className="flex flex-col items-center gap-3 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50 p-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
          {coach.avatar}
        </span>
        <p className="text-sm text-slate-500">你的专属 Referral Code</p>
        <p className="text-2xl font-semibold tracking-widest text-slate-900">{coach.referralCode}</p>

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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="累计邀请成功" value={otherCustomers.length + 12} unit="位" icon="🔗" accent="bg-sky-50 text-sky-600" />
        <StatCard label="本月新增" value={4} unit="位" icon="✨" accent="bg-emerald-50 text-emerald-600" />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">最近通过 Referral 加入</p>
        <div className="flex flex-col gap-2">
          {otherCustomers.slice(0, 3).map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-lg">{c.avatar}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">加入第 {c.currentDay} 天</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">已加入</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
