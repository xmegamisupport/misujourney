import type { TimelineEvent, TimelineEventKind } from "@/lib/coach/workspace-types";

const ICONS: Record<TimelineEventKind, string> = {
  journey_started: "🚩",
  first_body_progress: "🧍",
  new_lowest_weight: "⚖️",
  journey_completed: "🏆",
  recent_missed_checkins: "🕗",
  recent_support_signal: "❤️",
};

function formatMonthDay(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

/** Read-only Journey history so the Coach grasps the whole arc in one glance. */
export function JourneyTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-700">Journey 时间线</p>
      <ul className="flex flex-col gap-3">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-sm">{ICONS[e.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700">{e.label}</p>
              {e.date && <p className="text-xs text-slate-400">{formatMonthDay(e.date)}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
