"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomerCard } from "@/components/ui/CustomerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { allCustomers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAllInventory, useAllCheckIns, useActiveAlerts } from "@/lib/inventory/hooks";
import {
  PRODUCT_LABELS,
  INVENTORY_ALERT_STATUS_LABELS,
  INVENTORY_ALERT_STATUS_STYLES,
  getInventoryAlertStatus,
  combineAlertStatuses,
} from "@/lib/inventory/constants";
import type { ProductCode } from "@/lib/inventory/types";

const filters = [
  { key: "all", label: "全部" },
  { key: "attention", label: "需要关注" },
  { key: "active", label: "高活跃" },
];

export default function CustomerListPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const inventoryMap = useAllInventory();
  const checkInMap = useAllCheckIns();
  const activeAlerts = useActiveAlerts();

  const customers = useMemo(() => {
    return allCustomers.filter((c) => {
      const matchesQuery = c.name.includes(query);
      const matchesFilter =
        filter === "all" ||
        (filter === "attention" && (c.streakDays === 0 || c.todayCompletionRate < 40)) ||
        (filter === "active" && c.tags.includes("高活跃"));
      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="我的顾客" subtitle={`共 ${allCustomers.length} 位顾客`} />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索顾客姓名"
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              filter === f.key ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {customers.length === 0 ? (
        <EmptyState icon="🔍" title="没有找到符合条件的顾客" />
      ) : (
        <div className="flex flex-col gap-2">
          {customers.map((c) => {
            const rows = inventoryMap[c.id] ?? [];
            const nRemaining = rows.find((r) => r.productCode === "MISU_N_PLUS")?.remainingUnits;
            const dxRemaining = rows.find((r) => r.productCode === "MISU_DX_PLUS")?.remainingUnits;
            const checkIns = checkInMap[c.id] ?? [];
            const lastCheckInDate = checkIns.length > 0 ? [...checkIns].sort((a, b) => b.date.localeCompare(a.date))[0].date : null;
            const needsFollowUp = activeAlerts.some((a) => a.customerId === c.id);

            const statuses = rows.map((r) => getInventoryAlertStatus(r.productCode, r.remainingUnits));
            const combined = rows.length > 0 ? combineAlertStatuses(statuses) : null;

            return (
              <CustomerCard
                key={c.id}
                customer={c}
                href={`/coach/customers/${c.id}`}
                footer={
                  rows.length === 0 ? (
                    <p className="text-xs text-slate-400">尚未填写产品库存资料</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        {(["MISU_N_PLUS", "MISU_DX_PLUS"] as ProductCode[]).map((code) => {
                          const remaining = code === "MISU_N_PLUS" ? nRemaining : dxRemaining;
                          return (
                            <span key={code}>
                              {PRODUCT_LABELS[code]}：{remaining !== undefined ? `剩余 ${remaining} 包` : "未记录"}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {combined && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-medium",
                              INVENTORY_ALERT_STATUS_STYLES[combined].chip,
                            )}
                          >
                            状态：{INVENTORY_ALERT_STATUS_LABELS[combined]}
                          </span>
                        )}
                        {needsFollowUp && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600">
                            需要跟进回购
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          最近打卡：{lastCheckInDate ?? "暂无记录"}
                        </span>
                      </div>
                    </div>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
