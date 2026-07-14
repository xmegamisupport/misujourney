"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCoachProfile, useMyCustomers } from "@/lib/coach/hooks";
import { useActiveAlerts, useCheckInsForCustomers } from "@/lib/inventory/hooks";
import { useCheckoutsForCustomers } from "@/lib/checkout/hooks";
import { useAttentionFlagsForCustomers } from "@/lib/insights/hooks";

function daysAgoDateStr(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export default function CoachDashboardPage() {
  const { user } = useAuthUser();
  const coachId = user?.id ?? "";
  const { data: coach } = useMyCoachProfile(coachId);
  const { data: customers } = useMyCustomers(coachId);
  const customerIds = useMemo(() => customers.map((c) => c.id), [customers]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const weekAgo = useMemo(() => daysAgoDateStr(6), []);

  const { data: checkInMap } = useCheckInsForCustomers(customerIds);
  const { data: checkoutMap } = useCheckoutsForCustomers(customerIds, weekAgo, today);
  const { data: flagsMap } = useAttentionFlagsForCustomers(customerIds);
  const { data: repurchaseAlerts } = useActiveAlerts();

  const activeThisWeek = customerIds.filter((id) => (checkInMap[id] ?? []).some((ci) => ci.date >= weekAgo)).length;
  const needsAttention = customerIds.filter((id) => (flagsMap[id] ?? []).length > 0).length;
  const noCheckoutToday = customerIds.filter((id) => !(checkoutMap[id] ?? []).some((co) => co.checkoutDate === today)).length;

  const priorityList = useMemo(() => {
    return customers
      .map((c) => ({ customer: c, flags: flagsMap[c.id] ?? [] }))
      .filter((row) => row.flags.length > 0)
      .sort((a, b) => {
        const aImportant = a.flags.some((f) => f.severity === "important") ? 1 : 0;
        const bImportant = b.flags.some((f) => f.severity === "important") ? 1 : 0;
        return bImportant - aImportant;
      })
      .slice(0, 4);
  }, [customers, flagsMap]);

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title={`早安，${coach?.name ?? ""} ${coach?.avatar ?? "🌿"}`} subtitle="Every Day Is A New Journey · 教练工作台" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="我的顾客总数" value={customers.length} unit="位" icon="👥" accent="bg-sky-50 text-sky-600" />
        <StatCard label="本周活跃顾客" value={activeThisWeek} unit="位" icon="✨" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="需要关注顾客" value={needsAttention} unit="位" icon="⚠️" accent="bg-rose-50 text-rose-500" />
        <StatCard label="今日未回顾" value={noCheckoutToday} unit="位" icon="🌙" accent="bg-amber-50 text-amber-600" />
      </div>

      <Link href="/coach/alerts?tab=repurchase" className="block">
        <StatCard label="产品回购提醒" value={repurchaseAlerts.length} unit="项" icon="📦" accent="bg-violet-50 text-violet-600" />
      </Link>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">今天优先跟进名单</p>
          <Link href="/coach/alerts" className="text-xs font-medium text-sky-600">
            查看全部 →
          </Link>
        </div>
        {priorityList.length === 0 ? (
          <EmptyState icon="🎉" title="今天没有需要优先跟进的顾客" />
        ) : (
          <div className="flex flex-col gap-2">
            {priorityList.map(({ customer, flags }) => (
              <Link
                key={customer.id}
                href={`/coach/customers/${customer.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg">{customer.avatar ?? "🙂"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{customer.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {flags[0]?.flagLabel}
                    {flags.length > 1 ? ` 等 ${flags.length} 项` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
