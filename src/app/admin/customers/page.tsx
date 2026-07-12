"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { allCustomers, currentCoach } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const stockLabel = { ok: "充足", low: "即将用完", out: "已用完" } as const;
const stockStyle = {
  ok: "bg-emerald-50 text-emerald-600",
  low: "bg-amber-50 text-amber-600",
  out: "bg-rose-50 text-rose-500",
} as const;

export default function CustomerManagementPage() {
  const [query, setQuery] = useState("");

  const customers = useMemo(() => allCustomers.filter((c) => c.name.includes(query)), [query]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="Customer Management" subtitle={`共 ${allCustomers.length} 位顾客`} />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索顾客姓名"
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 md:max-w-xs"
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">姓名</th>
              <th className="px-4 py-3 font-medium">负责教练</th>
              <th className="px-4 py-3 font-medium">进度</th>
              <th className="px-4 py-3 font-medium">打卡率</th>
              <th className="px-4 py-3 font-medium">MISU Score</th>
              <th className="px-4 py-3 font-medium">产品库存</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    <span className="text-base">{c.avatar}</span>
                    {c.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{currentCoach.name}</td>
                <td className="px-4 py-3 text-slate-500">
                  Day {c.currentDay}/{c.planLength}
                </td>
                <td className="px-4 py-3 text-slate-500">{c.checkinRate}%</td>
                <td className="px-4 py-3 text-slate-500">{c.todayMisuScore}</td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", stockStyle[c.productStock])}>
                    {stockLabel[c.productStock]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
