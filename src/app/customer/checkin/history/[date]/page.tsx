"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useCustomerCheckIns } from "@/lib/inventory/hooks";
import { CheckInSummaryCard, formatMonthDay } from "@/components/inventory/CheckInSummaryCard";

/** Reuses the same full-history fetch as the list page (already RLS-scoped
 * to the logged-in customer's own rows) and just looks up the one date —
 * no separate by-date endpoint, so there's no way to reach another
 * customer's record by editing the URL: the underlying query never leaves
 * "my own check-ins" regardless of what :date is. */
export default function CheckInHistoryDetailPage() {
  const params = useParams<{ date: string }>();
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: checkIns, loading } = useCustomerCheckIns(customerId);
  const record = checkIns.find((ci) => ci.date === params.date);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title={params.date ? `${formatMonthDay(params.date)}晨重详情` : "晨重详情"} backHref="/customer/checkin/history" />

      {!loading && !record ? (
        <EmptyState icon="🔍" title="找不到这天的记录" />
      ) : record ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <CheckInSummaryCard record={record} />
        </div>
      ) : null}
    </div>
  );
}
