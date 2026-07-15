"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useCustomerCheckIns } from "@/lib/inventory/hooks";
import { formatMonthDay, sleepDurationLabel } from "@/components/inventory/CheckInSummaryCard";

/** getCheckInsForCustomer() (behind useCustomerCheckIns) only ever returns
 * rows that exist — a day with no check-in simply isn't in the list, no
 * blank/placeholder row is synthesized for it. */
export default function CheckInHistoryPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: checkIns, loading } = useCustomerCheckIns(customerId);

  return (
    <div className="flex flex-col gap-3 px-4 pb-8 md:px-8">
      <PageHeader title="晨重历史" subtitle={`共 ${checkIns.length} 笔记录`} backHref="/customer/checkin" />

      {!loading && checkIns.length === 0 ? (
        <EmptyState icon="⚖️" title="还没有晨重记录" />
      ) : (
        checkIns.map((ci) => (
          <Link
            key={ci.id}
            href={`/customer/checkin/history/${ci.date}`}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{formatMonthDay(ci.date)}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {ci.weight}kg · 睡眠 {sleepDurationLabel(ci)}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">✓ 已完成</span>
          </Link>
        ))
      )}
    </div>
  );
}
