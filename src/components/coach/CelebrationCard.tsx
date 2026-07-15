import Link from "next/link";
import type { CelebrationItem } from "@/lib/coach/workspace-types";

/** A celebration is a coaching opportunity, framed from the Coach's
 * perspective — the row already answers "why celebrate today". */
export function CelebrationCard({ item }: { item: CelebrationItem }) {
  return (
    <Link
      href={`/coach/customers/${item.customerId}`}
      className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg">{item.avatar ?? "🙂"}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {item.customerName}
          <span className="text-xs font-normal text-slate-400">
            {item.journeyName.emoji} {item.journeyName.name} · Day {item.journeyDay}
          </span>
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">🎉 {item.reasonNarrative}</p>
      </div>
    </Link>
  );
}
