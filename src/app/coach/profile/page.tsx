"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountSettingsSection } from "@/components/AccountSettingsSection";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCoachProfile, useMyCustomers } from "@/lib/coach/hooks";
import { useCheckInsForCustomers } from "@/lib/inventory/hooks";

const linkItems = [
  { href: "/coach/referral", label: "我的 Referral", icon: "🔗" },
  { href: "/coach/customers", label: "我的顾客", icon: "👥" },
  { href: "/coach/alerts", label: "跟进提醒", icon: "🔔" },
];

const staticItems = [
  { label: "通知设置", icon: "🔔" },
  { label: "帮助中心", icon: "❓" },
];

function daysAgoDateStr(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export default function CoachProfilePage() {
  const { user } = useAuthUser();
  const coachId = user?.id ?? "";
  const { data: coach } = useMyCoachProfile(coachId);
  const { data: customers } = useMyCustomers(coachId);
  const customerIds = useMemo(() => customers.map((c) => c.id), [customers]);
  const weekAgo = useMemo(() => daysAgoDateStr(6), []);
  const { data: checkInMap } = useCheckInsForCustomers(customerIds);
  const activeThisWeek = customerIds.filter((id) => (checkInMap[id] ?? []).some((ci) => ci.date >= weekAgo)).length;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="我的" />

      <div className="flex items-center gap-4 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
          {coach?.avatar ?? "🌿"}
        </span>
        <div>
          <p className="text-lg font-semibold text-slate-900">{coach?.name ?? ""}</p>
          <p className="text-sm text-slate-500">MISU Journey Coach</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">{customers.length}</p>
          <p className="text-xs text-slate-400">总顾客数</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">{activeThisWeek}</p>
          <p className="text-xs text-slate-400">本周活跃</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {linkItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-sm text-slate-700 last:border-b-0 hover:bg-slate-50"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-slate-300">→</span>
          </Link>
        ))}
      </div>

      <AccountSettingsSection />

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <LanguageSwitcher />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {staticItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-sm text-slate-700 last:border-b-0"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-slate-300">→</span>
          </div>
        ))}
      </div>

      <SignOutButton className="rounded-xl border border-rose-100 bg-rose-50 py-3 text-center text-sm font-semibold text-rose-500 transition hover:bg-rose-100" />
    </div>
  );
}
