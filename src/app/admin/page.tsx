"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { useAdminOverviewStats } from "@/lib/admin/overview";

const contentShortcuts = [
  { href: "/admin/content/faq", label: "FAQ 管理", icon: "💬" },
  { href: "/admin/content/guide", label: "产品指南管理", icon: "📦" },
];

export default function AdminDashboardPage() {
  const { data: o } = useAdminOverviewStats();

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="XMEGAMI Admin" subtitle="平台数据总览" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Customer 总数" value={o.totalCustomers} icon="🧑‍🤝‍🧑" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Coach 总数" value={o.totalCoaches} icon="🌿" accent="bg-sky-50 text-sky-600" />
        <StatCard label="今日活跃人数" value={o.activeToday} icon="✨" accent="bg-violet-50 text-violet-600" />
        <StatCard label="待处理异常" value={o.pendingIssues} icon="⚠️" accent="bg-rose-50 text-rose-500" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ProgressCard label="平均打卡率" percent={o.avgCheckinRate} icon="✅" barColor="bg-emerald-500" trackColor="bg-emerald-100" />
        <ProgressCard label="60 天计划完成率" percent={o.plan60CompletionRate} icon="📅" barColor="bg-sky-500" trackColor="bg-sky-100" />
        <ProgressCard label="90 天计划完成率" percent={o.plan90CompletionRate} icon="📆" barColor="bg-violet-500" trackColor="bg-violet-100" />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">内容管理快捷入口</p>
        <div className="grid grid-cols-2 gap-3">
          {contentShortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm transition hover:border-violet-200"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-medium text-slate-600">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
