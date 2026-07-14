"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAllCoaches, useAllCustomersForAdmin } from "@/lib/coach/hooks";
import { INVENTORY_ALERT_STATUS_LABELS, INVENTORY_ALERT_STATUS_STYLES } from "@/lib/inventory/constants";
import { cn } from "@/lib/utils";

export default function CoachCustomersPage() {
  const params = useParams<{ id: string }>();
  const [query, setQuery] = useState("");
  const { data: coaches, loading: coachLoading } = useAllCoaches();
  const { data: allCustomers, loading: customersLoading } = useAllCustomersForAdmin(params.id);

  const coach = coaches.find((c) => c.id === params.id);
  const customers = useMemo(() => allCustomers.filter((c) => c.name.includes(query)), [allCustomers, query]);
  const loading = coachLoading || customersLoading;

  if (!coachLoading && !coach) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
        <PageHeader title="教练不存在" backHref="/admin/coaches" />
        <EmptyState icon="🔍" title="找不到这位教练" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader
        title={coach ? `${coach.name} 的顾客` : "加载中..."}
        subtitle={`共 ${allCustomers.length} 位绑定顾客`}
        backHref="/admin/coaches"
      />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索顾客姓名"
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 md:max-w-xs"
      />

      {!loading && customers.length === 0 ? (
        <EmptyState icon="🔍" title={allCustomers.length === 0 ? "这位教练还没有绑定顾客" : "没有找到符合条件的顾客"} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-4 py-3 font-medium">姓名</th>
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
                      <span className="text-base">{c.avatar ?? "🙂"}</span>
                      {c.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    Day {c.currentDay}/{c.planLength}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.checkinRate}%</td>
                  <td className="px-4 py-3 text-slate-500">{c.todayMisuScore}</td>
                  <td className="px-4 py-3">
                    {c.stockStatus ? (
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", INVENTORY_ALERT_STATUS_STYLES[c.stockStatus].chip)}>
                        {INVENTORY_ALERT_STATUS_LABELS[c.stockStatus]}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">尚未初始化</span>
                    )}
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
