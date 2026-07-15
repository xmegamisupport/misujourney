import Link from "next/link";
import type { BodyProgressRecord } from "@/lib/bodyProgress/types";

function formatMonthDay(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${Number(month)}月${Number(day)}日`;
}

interface BodyProgressMilestoneCardProps {
  record: BodyProgressRecord;
  isFirst: boolean;
  frontPhotoUrl: string | null;
  href: string;
}

/** "Milestone Complete, Journey Day 28" instead of a bare date — the UI
 * should read as progress, not a log entry. The very first record gets its
 * own "Starting Point Complete" wording per the product's emphasis on that
 * one being a distinct, foundational moment. */
export function BodyProgressMilestoneCard({ record, isFirst, frontPhotoUrl, href }: BodyProgressMilestoneCardProps) {
  const title = isFirst ? "起点记录完成" : "里程碑完成";

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50">
        {frontPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frontPhotoUrl} alt="正面" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xl text-slate-300">🧍</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-emerald-600">✓ {title}</p>
        <p className="mt-0.5 text-sm text-slate-700">Journey Day {record.journeyDay}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {formatMonthDay(record.submittedAt)}
          {record.weightValue !== null ? ` · ${record.weightValue}kg` : ""}
        </p>
      </div>
    </Link>
  );
}

export { formatMonthDay };
