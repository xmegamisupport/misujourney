import Link from "next/link";
import { cn } from "@/lib/utils";
import { SUPPORT_PRIORITY_LABELS, SUPPORT_PRIORITY_STYLES } from "@/lib/coach/workspace-config";
import type { SupportItem } from "@/lib/coach/workspace-types";

/** Support is a priority list, not a problem list — the row already answers
 * "why today", so the Coach decides before opening the Focus View. */
export function SupportCard({ item }: { item: SupportItem }) {
  return (
    <Link
      href={`/coach/customers/${item.customerId}`}
      className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">{item.avatar ?? "🙂"}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {item.customerName}
          <span className="text-xs font-normal text-slate-400">
            {item.journeyName.emoji} Day {item.journeyDay}
          </span>
        </p>
        <ul className="mt-1 flex flex-col gap-0.5 text-sm text-slate-600">
          {item.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="leading-relaxed">
              · {r.text}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-emerald-600">建议今天主动关心 TA。</p>
      </div>
      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", SUPPORT_PRIORITY_STYLES[item.priority])}>
        {SUPPORT_PRIORITY_LABELS[item.priority]}
      </span>
    </Link>
  );
}
