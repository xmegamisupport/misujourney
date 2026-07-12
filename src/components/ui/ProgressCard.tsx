import { cn } from "@/lib/utils";

interface ProgressCardProps {
  label: string;
  percent: number;
  sublabel?: string;
  icon?: string;
  barColor?: string;
  trackColor?: string;
}

export function ProgressCard({
  label,
  percent,
  sublabel,
  icon,
  barColor = "bg-emerald-500",
  trackColor = "bg-emerald-100",
}: ProgressCardProps) {
  const safePercent = Math.max(0, Math.min(100, percent));
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
          {icon && <span>{icon}</span>}
          {label}
        </span>
        <span className="text-sm font-semibold text-slate-900">{safePercent}%</span>
      </div>
      <div className={cn("h-2.5 w-full overflow-hidden rounded-full", trackColor)}>
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${safePercent}%` }}
        />
      </div>
      {sublabel && <span className="text-xs text-slate-400">{sublabel}</span>}
    </div>
  );
}
