"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCustomers } from "@/lib/coach/hooks";
import { useCheckInsForCustomers } from "@/lib/inventory/hooks";
import { useGoalPlansForCustomers } from "@/lib/goals/hooks";
import { journeyNameFor } from "@/lib/coach/workspace-config";
import { calculateCurrentDay } from "@/lib/journey";
import { normalizeWhatsAppNumber, buildWhatsAppLink, buildCustomerContactMessage } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type JourneyState = "active" | "completed" | "paused";

const JOURNEY_STATE: Record<JourneyState, { label: string; className: string }> = {
  active: { label: "🌱 进行中", className: "bg-emerald-50 text-emerald-700" },
  completed: { label: "🏁 已完成", className: "bg-sky-50 text-sky-700" },
  paused: { label: "⏸ 已暂停", className: "bg-slate-100 text-slate-500" },
};

const filters: { key: "all" | JourneyState; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "completed", label: "已完成" },
  { key: "paused", label: "已暂停" },
];

export default function CustomerListPage() {
  const { user } = useAuthUser();
  const coachId = user?.id ?? "";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | JourneyState>("all");

  const { data: customers } = useMyCustomers(coachId);
  const customerIds = useMemo(() => customers.map((c) => c.id), [customers]);

  const { data: checkInMap } = useCheckInsForCustomers(customerIds);
  const { data: goalPlanMap } = useGoalPlansForCustomers(customerIds);

  const rows = useMemo(() => {
    return customers
      .filter((c) => c.name.includes(query))
      .map((c) => {
        const checkIns = [...(checkInMap[c.id] ?? [])].sort((a, b) => b.date.localeCompare(a.date));
        const latestWeight = checkIns[0]?.weight ?? null;
        const journeyDays = goalPlanMap[c.id]?.journeyDays ?? null;
        const journeyName = journeyNameFor(journeyDays);
        const rawDay = c.startDate ? calculateCurrentDay(c.startDate) : null;
        const journeyDay = rawDay !== null && journeyDays ? Math.min(rawDay, journeyDays) : rawDay;
        // "paused" has no data source in the MVP yet — always active/completed
        // for now (see the Coach pause workflow).
        const state: JourneyState = rawDay !== null && journeyDays && rawDay >= journeyDays ? "completed" : "active";
        const whatsappNumber = c.phone ? normalizeWhatsAppNumber(c.phone) : null;
        return { customer: c, latestWeight, journeyName, journeyDay, state, whatsappNumber };
      })
      .filter((row) => (filter === "all" ? true : row.state === filter));
  }, [customers, query, filter, checkInMap, goalPlanMap]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="我的顾客" subtitle={`共 ${customers.length} 位顾客`} />

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

      {rows.length === 0 ? (
        <EmptyState icon="🔍" title="没有找到符合条件的顾客" />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ customer, latestWeight, journeyName, journeyDay, state, whatsappNumber }) => (
            <div key={customer.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <Link href={`/coach/customers/${customer.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xl">{customer.avatar ?? "🙂"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{customer.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {journeyName.emoji} {journeyName.name}
                    {journeyDay !== null && ` · Day ${journeyDay}`}
                    {latestWeight !== null && ` · ${latestWeight}kg`}
                  </p>
                  <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", JOURNEY_STATE[state].className)}>
                    {JOURNEY_STATE[state].label}
                  </span>
                </div>
              </Link>
              {whatsappNumber ? (
                <a
                  href={buildWhatsAppLink(whatsappNumber, buildCustomerContactMessage(customer.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                >
                  💬 WhatsApp
                </a>
              ) : (
                <span className="shrink-0 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-medium text-slate-400">未设置号码</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
