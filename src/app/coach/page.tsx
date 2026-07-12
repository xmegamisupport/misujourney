"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { AlertCard } from "@/components/ui/AlertCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { currentCoach, coachAlerts } from "@/lib/mock-data";
import { useActiveAlerts } from "@/lib/inventory/hooks";

export default function CoachDashboardPage() {
  const coach = currentCoach;
  const noCheckin = coachAlerts.filter((a) => a.type === "no-checkin").length;
  const weightStall = coachAlerts.filter((a) => a.type === "weight-stall").length;
  const priorityList = [...coachAlerts].sort((a) => (a.severity === "high" ? -1 : 1)).slice(0, 4);
  const repurchaseAlerts = useActiveAlerts();

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title={`早安，${coach.name} 🌿`} subtitle="Every Day Is A New Journey · 教练工作台" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="我的顾客总数" value={coach.totalCustomers} unit="位" icon="👥" accent="bg-sky-50 text-sky-600" />
        <StatCard label="本周活跃顾客" value={coach.activeThisWeek} unit="位" icon="✨" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="连续3天未打卡" value={noCheckin} unit="位" icon="📵" accent="bg-rose-50 text-rose-500" />
        <StatCard label="体重停滞" value={weightStall} unit="位" icon="⚖️" accent="bg-amber-50 text-amber-600" />
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
            {priorityList.map((alert) => (
              <AlertCard key={alert.id} alert={alert} href={`/coach/customers/${alert.customerId}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
