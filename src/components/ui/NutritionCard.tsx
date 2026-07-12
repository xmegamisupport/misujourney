import { cn } from "@/lib/utils";

interface NutritionCardProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  icon?: string;
  color?: string;
}

export function NutritionCard({ label, value, target, unit, icon, color = "bg-emerald-400" }: NutritionCardProps) {
  const percent = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1 font-medium text-slate-600">
          {icon && <span>{icon}</span>}
          {label}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold text-slate-900">{value}</span>
        <span className="text-xs text-slate-400">/ {target}{unit}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
