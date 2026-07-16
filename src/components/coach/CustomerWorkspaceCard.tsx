import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CoachCustomerCard, CustomerCardStatus } from "@/lib/coach/workspace-types";

const STATUS: Record<CustomerCardStatus, { label: string; className: string }> = {
  celebrate: { label: "🎉 值得庆祝", className: "bg-emerald-50 text-emerald-700" },
  support: { label: "❤️ 需要支持", className: "bg-amber-50 text-amber-700" },
  celebrate_support: { label: "🎉❤️ 庆祝 & 支持", className: "bg-rose-50 text-rose-600" },
};

/** One customer = one card. The Dashboard is a decision surface: it answers
 * only "who should I connect with today?" with a single state — never the
 * underlying diagnostic signals. All the "why" lives in the Focus View. */
export function CustomerWorkspaceCard({ card }: { card: CoachCustomerCard }) {
  const status = STATUS[card.status];

  return (
    <Link
      href={`/coach/customers/${card.customerId}`}
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md",
        card.overallTone === "support" ? "border-amber-100 hover:border-amber-200" : "border-emerald-100 hover:border-emerald-200",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
          card.overallTone === "support" ? "bg-amber-50" : "bg-emerald-50",
        )}
      >
        {card.avatar ?? "🙂"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{card.customerName}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {card.journeyName.emoji} {card.journeyName.name} · Day {card.journeyDay}
        </p>
      </div>
      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", status.className)}>{status.label}</span>
    </Link>
  );
}
