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
 *   🔴 attention    red        needs the customer
 *
 * Three shapes, same language — chosen by how often a task is touched:
 *   • "row"     — full width, for a CONTINUOUS task with inline controls (water)
 *   • "tile"    — half-width, the standard task card
 *   • "compact" — a settled ONE-TIME task: same card, roughly half the height
 * Each task keeps a fixed grid slot; only its HEIGHT changes as it's completed,
 * so the Dashboard gets lighter through the day without anything moving around.
 *
 * `isNext` gives the single next recommended task a quiet lift (ring + NEXT
 * badge) so the eye lands on it without the page shouting.
 *
 * Microcopy rule: values are facts, not sentences — "68kg", "2 餐", "今晚开放".
 */
export type JourneyTaskStatus = "completed" | "available" | "in_progress" | "locked" | "attention";

const STATUS_STYLES: Record<JourneyTaskStatus, { card: string; iconWrap: string; label: string }> = {
  completed: { card: "border-emerald-200 bg-emerald-50/60", iconWrap: "bg-white", label: "text-slate-500" },
  available: { card: "border-slate-200 bg-white", iconWrap: "bg-slate-50", label: "text-slate-800" },
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
  /** How the value line reads:
   *   "muted"  — a plain fact ("68kg", "2 餐")
   *   "action" — something to DO today, emerald ("开始 →")
   *   "nav"    — somewhere to LOOK, neutral grey ("查看 →")
   * Green means "do this"; grey means "you may view this". */
  valueTone?: "muted" | "action" | "nav";
  /** 0-100. Renders the bar + percentage for `in_progress`. */
  percent?: number;
  href?: string;
  /** Trailing call-to-action. Defaults to "开始 →" for `available`. */
  actionLabel?: string;
  /** Replaces the trailing element entirely (e.g. an inline skip button). */
  actionSlot?: ReactNode;
  /** The next recommended task — a quiet ring + NEXT badge. */
  isNext?: boolean;
  /** "compact" is the shortened card for a settled ONE-TIME task. */
  variant?: "tile" | "row" | "compact";
  /** Used when there's no href (e.g. a card that reopens a modal). */
  onClick?: () => void;
  /** Inline controls under the row (e.g. water quick-adds). `row` only. */
  children?: ReactNode;
}

function StatusMark({ status, percent }: { status: JourneyTaskStatus; percent?: number }) {
  if (status === "completed") {
    return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs text-white">✓</span>;
  }
  if (status === "locked") return <span className="shrink-0 text-base leading-none text-amber-500">🔒</span>;
  if (status === "attention") return <span className="shrink-0 text-base leading-none text-rose-500">⚠️</span>;
  if (status === "in_progress" && typeof percent === "number") {
    return <span className="shrink-0 text-sm font-semibold text-sky-600">{Math.round(percent)}%</span>;
  }
  return null;
}

function NextBadge() {
  return <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">NEXT</span>;
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
  isNext,
  variant = "tile",
  onClick,
  children,
}: JourneyTaskCardProps) {
  const s = STATUS_STYLES[status];

  // ── Compact card: a settled ONE-TIME task. Still a card — border, fill, same
  // grid column — just about half the height, and `self-start` so it doesn't
  // stretch to match a taller neighbour. Deliberately NOT a pill/label: a
  // finished milestone should still read as a milestone.
  if (variant === "compact") {
    const done = status === "completed";
    const compactClass = cn(
      "flex items-center gap-2 self-start rounded-2xl border px-3 py-2.5 text-left transition",
      done ? "border-emerald-200 bg-emerald-50/60 active:bg-emerald-100/70" : "border-slate-200 bg-white active:bg-slate-50",
    );
    // Keeps the icon: it's the visual anchor that lets a finished task be
    // recognised without reading it. Same identity as the full card, less height.
    const inner = (
      <>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm shadow-sm", done ? "bg-white" : "bg-slate-50")}>
          {icon}
        </span>
        <p className={cn("min-w-0 flex-1 truncate text-xs font-medium", done ? "text-emerald-800" : "text-slate-500")}>{label}</p>
        {value && <span className={cn("shrink-0 text-[11px] font-medium", done ? "text-emerald-600/80" : "text-slate-400")}>{value}</span>}
        {done && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[10px] text-white">✓</span>}
      </>
    );
    if (href) {
      return (
        <Link href={href} className={compactClass}>
          {inner}
        </Link>
      );
    }
    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={compactClass}>
          {inner}
        </button>
      );
    }
    return <div className={compactClass}>{inner}</div>;
  }
  // An actionable card with no fact of its own shows its call to action instead.
  const isAction = !value && status === "available" && Boolean(href || actionLabel);
  const displayValue = value ?? (isAction ? (actionLabel ?? "开始 →") : undefined);
  const tone: "muted" | "action" | "nav" = isAction ? "action" : valueTone;

  const shell = cn(
    "block rounded-2xl border transition",
    s.card,
    isNext && "ring-2 ring-emerald-400/40 shadow-md",
    variant === "tile" ? "flex h-full flex-col justify-between p-3.5" : "p-3.5",
  );

  const valueEl = displayValue && (
    <p
      className={cn(
        "mt-0.5 truncate text-xs",
        tone === "action" ? "font-semibold text-emerald-600" : tone === "nav" ? "font-medium text-slate-500" : "text-slate-400",
      )}
    >
      {displayValue}
    </p>
  );

  const body =
    variant === "tile" ? (
      <>
        <div className="flex items-start justify-between gap-2">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg shadow-sm", s.iconWrap)}>{icon}</span>
          {actionSlot ?? (isNext ? <NextBadge /> : <StatusMark status={status} percent={percent} />)}
        </div>
        <div className="mt-3 min-w-0">
          <p className={cn("truncate text-sm font-medium", s.label)}>{label}</p>
          {valueEl}
        </div>
      </>
    ) : (
      <>
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg shadow-sm", s.iconWrap)}>{icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={cn("truncate text-sm font-medium", s.label)}>{label}</p>
              {isNext && <NextBadge />}
            </div>
            {valueEl}
          </div>
          {actionSlot ?? <StatusMark status={status} percent={percent} />}
        </div>

        {status === "in_progress" && typeof percent === "number" && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sky-50">
            <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
          </div>
        )}

        {children}
      </>
    );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}
