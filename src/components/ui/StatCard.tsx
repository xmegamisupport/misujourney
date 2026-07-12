import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: string;
  hint?: string;
  accent?: string;
}

export function StatCard({ label, value, unit, icon, hint, accent = "bg-emerald-50 text-emerald-600" }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm", accent)}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-slate-900">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
}
