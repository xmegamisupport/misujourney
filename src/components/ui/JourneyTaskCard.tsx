import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** ── MISU Dashboard Design System ──────────────────────────────────────────
 *
 * One card, one visual language, for every Dashboard task — today's five and
 * any future one (exercise, supplements, sleep, coach messages, rewards…).
 * Status is communicated by COLOUR + ICON first and text second, so the
 * Dashboard can be understood in a glance rather than read line by line:
 *
 *   🟢 completed    green      done — a check, and the one fact that matters
 *   ⚪ available    neutral    ready to start — an inviting → action
 *   🔵 in_progress  blue       under way — progress bar + percentage
 *   🟡 locked       amber      opens later — lock icon + short helper
 *   🔴 attention    red        needs the customer (reserved for future use)
 *
 * Card anatomy (deliberately ONE row, not three stacked lines — five stacked
 * cards would not fit a phone screen, which defeats "glanceable"):
 *   [icon] [name + the single most important value] [status or action]
 * with an optional progress bar and optional inline controls underneath.
 *
 * Microcopy rule: values are facts, not sentences — "68kg", "2 餐", "今晚开放".
 */
export type JourneyTaskStatus = "completed" | "available" | "in_progress" | "locked" | "attention";

const STATUS_STYLES: Record<JourneyTaskStatus, { card: string; iconWrap: string; label: string }> = {
  completed: { card: "border-emerald-200 bg-emerald-50/60", iconWrap: "bg-white", label: "text-slate-500" },
  available: { card: "border-slate-100 bg-white hover:border-emerald-200", iconWrap: "bg-slate-50", label: "text-slate-800" },
  in_progress: { card: "border-sky-200 bg-white", iconWrap: "bg-sky-50", label: "text-slate-800" },
  locked: { card: "border-amber-200 bg-amber-50/50", iconWrap: "bg-white", label: "text-slate-500" },
  attention: { card: "border-rose-200 bg-rose-50/60", iconWrap: "bg-white", label: "text-slate-800" },
};

interface JourneyTaskCardProps {
  icon: string;
  label: string;
  status: JourneyTaskStatus;
  /** The single most important fact — "68kg", "1200 / 2000ml", "今晚开放". */
  value?: string;
  /** "accent" tints the value in the status colour (e.g. a 查看 → affordance). */
  valueTone?: "muted" | "accent";
  /** 0-100. Renders the bar + percentage for `in_progress`. */
  percent?: number;
  href?: string;
  /** Trailing call-to-action for `available`. Defaults to "开始 →". */
  actionLabel?: string;
  /** Replaces the trailing element entirely (e.g. an inline skip button). */
  actionSlot?: ReactNode;
  /** Inline controls under the row (e.g. water quick-adds). Keep it light. */
  children?: ReactNode;
}

function Trailing({ status, actionLabel, actionSlot, percent, href }: Pick<JourneyTaskCardProps, "status" | "actionLabel" | "actionSlot" | "percent" | "href">) {
  if (actionSlot) return <>{actionSlot}</>;

  if (status === "completed") {
    return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs text-white">✓</span>;
  }
  if (status === "locked") {
    return <span className="shrink-0 text-base text-amber-500">🔒</span>;
  }
  if (status === "attention") {
    return <span className="shrink-0 text-base text-rose-500">⚠️</span>;
  }
  if (status === "in_progress") {
    return typeof percent === "number" ? <span className="shrink-0 text-sm font-semibold text-sky-600">{Math.round(percent)}%</span> : null;
  }
  // available — only show a CTA when there's somewhere to go.
  if (!href && !actionLabel) return null;
  return <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">{actionLabel ?? "开始 →"}</span>;
}

export function JourneyTaskCard({
  icon,
  label,
  status,
  value,
  valueTone = "muted",
  percent,
  href,
  actionLabel,
  actionSlot,
  children,
}: JourneyTaskCardProps) {
  const s = STATUS_STYLES[status];

  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg shadow-sm", s.iconWrap)}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-medium", s.label)}>{label}</p>
          {value && (
            <p
              className={cn(
                "mt-0.5 truncate text-xs",
                valueTone === "accent" ? (status === "completed" ? "font-medium text-emerald-600" : "font-medium text-sky-600") : "text-slate-400",
              )}
            >
              {value}
            </p>
          )}
        </div>
        <Trailing status={status} actionLabel={actionLabel} actionSlot={actionSlot} percent={percent} href={href} />
      </div>

      {status === "in_progress" && typeof percent === "number" && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sky-50">
          <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        </div>
      )}

      {children}
    </>
  );

  const shell = cn("block rounded-2xl border p-3.5 transition", s.card);

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}
