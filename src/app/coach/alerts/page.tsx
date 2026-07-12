"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertCard } from "@/components/ui/AlertCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { coachAlerts, allCustomers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { AlertItem } from "@/lib/types";
import { useActiveAlerts, useAllInventory, useAllCheckIns } from "@/lib/inventory/hooks";
import { markAlertFollowedUp, calcAverageDailyUsage, calcEstimatedDaysRemaining } from "@/lib/inventory/engine";
import {
  PRODUCT_LABELS,
  PRODUCT_ICONS,
  INVENTORY_ALERT_STATUS_LABELS,
  INVENTORY_ALERT_STATUS_STYLES,
  compareAlertStatusSeverity,
} from "@/lib/inventory/constants";
import type { InventoryMap, CheckInMap } from "@/lib/inventory/storage";
import type { RepurchaseAlert, RepurchaseAlertLevel } from "@/lib/inventory/types";

const checkinFilters: { key: "all" | AlertItem["severity"]; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "high", label: "紧急" },
  { key: "medium", label: "关注" },
  { key: "low", label: "提示" },
];

const COACH_ID = "coach-001";

const levelOrder: RepurchaseAlertLevel[] = ["OUT_OF_STOCK", "URGENT", "REPURCHASE_SOON"];

const LEVEL_BORDER_COLOR: Record<RepurchaseAlertLevel, string> = {
  OUT_OF_STOCK: "border-l-rose-400",
  URGENT: "border-l-orange-400",
  REPURCHASE_SOON: "border-l-amber-400",
};

function FollowUpAlertsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "repurchase" ? "repurchase" : "checkin";
  const [tab, setTab] = useState<"checkin" | "repurchase">(initialTab);
  const [filter, setFilter] = useState<"all" | AlertItem["severity"]>("all");

  const checkinAlerts = useMemo(() => coachAlerts.filter((a) => filter === "all" || a.severity === filter), [filter]);

  const activeAlerts = useActiveAlerts();
  const inventoryMap = useAllInventory();
  const checkInMap = useAllCheckIns();

  const sortedRepurchaseAlerts = useMemo(() => {
    return [...activeAlerts].sort((a, b) => {
      const severityDiff = compareAlertStatusSeverity(a.alertLevel, b.alertLevel);
      if (severityDiff !== 0) return severityDiff;
      const remainingA = inventoryMap[a.customerId]?.find((r) => r.productCode === a.productCode)?.remainingUnits ?? 0;
      const remainingB = inventoryMap[b.customerId]?.find((r) => r.productCode === b.productCode)?.remainingUnits ?? 0;
      return remainingA - remainingB;
    });
  }, [activeAlerts, inventoryMap]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader
        title="跟进提醒"
        subtitle={tab === "checkin" ? `共 ${coachAlerts.length} 项提醒` : `共 ${activeAlerts.length} 项回购提醒`}
      />

      <div className="flex gap-2">
        <button
          onClick={() => setTab("checkin")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition",
            tab === "checkin" ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500",
          )}
        >
          打卡提醒
        </button>
        <button
          onClick={() => setTab("repurchase")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition",
            tab === "repurchase" ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500",
          )}
        >
          回购提醒{activeAlerts.length > 0 && ` (${activeAlerts.length})`}
        </button>
      </div>

      {tab === "checkin" ? (
        <>
          <div className="flex gap-2">
            {checkinFilters.map((f) => (
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

          {checkinAlerts.length === 0 ? (
            <EmptyState icon="🎉" title="这个分类下没有提醒" />
          ) : (
            <div className="flex flex-col gap-2">
              {checkinAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} href={`/coach/customers/${alert.customerId}`} />
              ))}
            </div>
          )}
        </>
      ) : sortedRepurchaseAlerts.length === 0 ? (
        <EmptyState icon="🎉" title="目前没有需要跟进的回购提醒" />
      ) : (
        <div className="flex flex-col gap-5">
          {levelOrder.map((level) => {
            const group = sortedRepurchaseAlerts.filter((a) => a.alertLevel === level);
            if (group.length === 0) return null;
            return (
              <div key={level}>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", INVENTORY_ALERT_STATUS_STYLES[level].chip)}>
                    {INVENTORY_ALERT_STATUS_LABELS[level]}
                  </span>
                  <span className="text-xs text-slate-400">{group.length} 项</span>
                </p>
                <div className="flex flex-col gap-2">
                  {group.map((alert) => (
                    <RepurchaseAlertCard key={alert.id} alert={alert} inventoryMap={inventoryMap} checkInMap={checkInMap} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RepurchaseAlertCard({
  alert,
  inventoryMap,
  checkInMap,
}: {
  alert: RepurchaseAlert;
  inventoryMap: InventoryMap;
  checkInMap: CheckInMap;
}) {
  const customer = allCustomers.find((c) => c.id === alert.customerId);
  const remaining = inventoryMap[alert.customerId]?.find((r) => r.productCode === alert.productCode)?.remainingUnits ?? 0;
  const avgDailyUsage = calcAverageDailyUsage(alert.customerId, alert.productCode);
  const estimatedDays = calcEstimatedDaysRemaining(remaining, avgDailyUsage);
  const checkIns = checkInMap[alert.customerId] ?? [];
  const lastCheckInDate = checkIns.length > 0 ? [...checkIns].sort((a, b) => b.date.localeCompare(a.date))[0].date : "暂无记录";

  return (
    <div className={cn("rounded-2xl border border-l-4 border-slate-100 bg-white p-4 shadow-sm", LEVEL_BORDER_COLOR[alert.alertLevel])}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span>{customer?.avatar}</span>
            {customer?.name ?? alert.customerId}
            <span className="text-xs font-normal text-slate-400">
              {PRODUCT_ICONS[alert.productCode]} {PRODUCT_LABELS[alert.productCode]}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            剩余 {remaining} 包 · 预计还能用 {estimatedDays !== null ? `${estimatedDays} 天` : "暂无法估算"}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            最近打卡：{lastCheckInDate} · 提醒触发：{alert.triggeredAt.slice(0, 10)}
          </p>
        </div>
        {alert.status === "FOLLOWED_UP" && (
          <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-600">已跟进</span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Link
          href="/coach/messages"
          className="rounded-xl border border-slate-200 py-2 text-center text-xs font-medium text-slate-600 transition hover:border-slate-300"
        >
          联系顾客
        </Link>
        <button
          type="button"
          disabled={alert.status === "FOLLOWED_UP"}
          onClick={() => markAlertFollowedUp(alert.id, COACH_ID)}
          className="rounded-xl border border-sky-200 py-2 text-center text-xs font-medium text-sky-600 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
        >
          标记已跟进
        </button>
        <Link
          href={`/coach/customers/${alert.customerId}`}
          className="rounded-xl bg-sky-500 py-2 text-center text-xs font-semibold text-white transition hover:bg-sky-600"
        >
          新增回购
        </Link>
      </div>
    </div>
  );
}

export default function FollowUpAlertsPage() {
  return (
    <Suspense fallback={null}>
      <FollowUpAlertsContent />
    </Suspense>
  );
}
