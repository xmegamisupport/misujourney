import Link from "next/link";
import type { ReactNode } from "react";
import type { CustomerProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CustomerCardProps {
  customer: CustomerProfile;
  href: string;
  footer?: ReactNode;
}

export function CustomerCard({ customer, href, footer }: CustomerCardProps) {
  const needsAttention = customer.streakDays === 0 || customer.todayCompletionRate < 40;
  return (
    <Link
      href={href}
      className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="relative shrink-0">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl">
            {customer.avatar}
          </span>
          {needsAttention && (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-rose-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-800">{customer.name}</p>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
              Day {customer.currentDay}/{customer.planLength}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {customer.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-600">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-lg font-semibold", customer.todayMisuScore >= 70 ? "text-emerald-600" : "text-amber-500")}>
            {customer.todayMisuScore}
          </p>
          <p className="text-[11px] text-slate-400">MISU Score</p>
        </div>
      </div>
      {footer && <div className="border-t border-slate-50 px-4 py-3">{footer}</div>}
    </Link>
  );
}
