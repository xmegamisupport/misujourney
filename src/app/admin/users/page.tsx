"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { adminUsers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const roleFilters: { key: "all" | Role; label: string }[] = [
  { key: "all", label: "全部角色" },
  { key: "customer", label: "Customer" },
  { key: "coach", label: "Coach" },
  { key: "admin", label: "Admin" },
];

const statusStyle = {
  active: "bg-emerald-50 text-emerald-600",
  inactive: "bg-slate-100 text-slate-500",
  pending: "bg-amber-50 text-amber-600",
};

const statusLabel = { active: "已启用", inactive: "已停用", pending: "待审核" };

export default function UserManagementPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");

  const users = useMemo(
    () =>
      adminUsers.filter(
        (u) => (role === "all" || u.role === role) && (u.name.includes(query) || u.email.includes(query)),
      ),
    [query, role],
  );

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="User Management" subtitle={`共 ${adminUsers.length} 位用户`} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索姓名或邮箱"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 md:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {roleFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setRole(f.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                role === f.key ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">姓名</th>
              <th className="px-4 py-3 font-medium">邮箱</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">加入时间</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3 text-slate-500 capitalize">{u.role}</td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyle[u.status])}>
                    {statusLabel[u.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{u.joinedAt}</td>
                <td className="px-4 py-3">
                  <button type="button" className="text-xs font-medium text-violet-600">
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
