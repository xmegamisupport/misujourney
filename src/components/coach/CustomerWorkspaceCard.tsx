import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CoachCustomerCard, CustomerSignalTag } from "@/lib/coach/workspace-types";

/** One customer = one card. The Home answers only "who should I talk to
 * today?" — name, Journey, and a few glanceable tags. All explanation, the
 * Journey Timeline and Coaching Scripts live in the Focus View. */
export function CustomerWorkspaceCard({ card }: { card: CoachCustomerCard }) {
  const tags = [...card.celebrationTags, ...card.supportTags];

  return (
    <Link
      href={`/coach/customers/${card.customerId}`}
      className={cn(
        "flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md",
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
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {card.customerName}
          <span className="text-xs font-normal text-slate-400">
            {card.journeyName.emoji} Day {card.journeyDay}
          </span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <Tag key={i} tag={tag} />
          ))}
        </div>
      </div>
    </Link>
  );
}

function Tag({ tag }: { tag: CustomerSignalTag }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tag.kind === "celebration" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      )}
    >
      <span aria-hidden>{tag.icon}</span>
      {tag.label}
    </span>
  );
}
