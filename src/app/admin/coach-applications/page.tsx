"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCoachApplicationsForAdmin } from "@/lib/coach-application/hooks";
import { STATUS_LABEL, STATUS_STYLE, formatApplicationNumber, type CoachApplicationStatus } from "@/lib/coach-application/types";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
}

const filters: { key: "all" | CoachApplicationStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "未通过" },
  { key: "withdrawn", label: "已撤回" },
];

export default function CoachApplicationsQueuePage() {
  const { data: applications, loading } = useCoachApplicationsForAdmin();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CoachApplicationStatus>("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (!q) return true;
      return (
        a.applicantName.toLowerCase().includes(q) ||
        a.resellerUsername.toLowerCase().includes(q) ||
        (a.email ?? "").toLowerCase().includes(q) ||
        (a.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [applications, query, status]);

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="Coach Applications" subtitle={`待审核 ${pendingCount} · 共 ${applications.length} 份申请`} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索姓名 / Username / 邮箱 / 电话"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 md:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                status === f.key ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!loading && rows.length === 0 ? (
        <EmptyState icon="🌿" title={applications.length === 0 ? "还没有教练申请" : "没有符合条件的申请"} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-4 py-3 font-medium">申请人</th>
                <th className="px-4 py-3 font-medium">Reseller Username</th>
                <th className="px-4 py-3 font-medium">邮箱</th>
                <th className="px-4 py-3 font-medium">电话</th>
                <th className="px-4 py-3 font-medium">提交时间</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{a.applicantName}</p>
                    <p className="text-xs text-slate-400">{formatApplicationNumber(a.applicationNumber)}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{a.resellerUsername}</td>
                  <td className="px-4 py-3 text-slate-500">{a.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{a.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDateTime(a.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[a.status])}>{STATUS_LABEL[a.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/coach-applications/${a.id}`}
                      className="rounded-full border border-violet-200 px-3 py-1 text-xs font-medium text-violet-600 transition hover:bg-violet-50"
                    >
                      {a.status === "pending" ? "审核" : "查看"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
