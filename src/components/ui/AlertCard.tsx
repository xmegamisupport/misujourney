import Link from "next/link";
import type { AlertItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AlertCardProps {
  alert: AlertItem;
  href?: string;
}

const severityStyles: Record<AlertItem["severity"], { border: string; badge: string; text: string }> = {
  high: { border: "border-l-rose-400", badge: "bg-rose-50 text-rose-600", text: "紧急" },
  medium: { border: "border-l-amber-400", badge: "bg-amber-50 text-amber-600", text: "关注" },
  low: { border: "border-l-slate-300", badge: "bg-slate-100 text-slate-500", text: "提示" },
};

const typeIcons: Record<AlertItem["type"], string> = {
  "no-checkin": "📵",
  "weight-stall": "⚖️",
  "low-stock": "📦",
  "low-score": "📉",
};

export function AlertCard({ alert, href }: AlertCardProps) {
  const style = severityStyles[alert.severity];
  const content = (
    <div className={cn("flex items-start gap-3 rounded-2xl border border-l-4 border-slate-100 bg-white p-4 shadow-sm", style.border)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">
        {typeIcons[alert.type]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{alert.avatar}</span>
          <p className="truncate text-sm font-semibold text-slate-800">{alert.customerName}</p>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", style.badge)}>{style.text}</span>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-700">{alert.title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{alert.detail}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
