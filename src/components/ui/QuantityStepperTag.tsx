import { cn } from "@/lib/utils";

interface QuantityStepperTagProps {
  icon?: string;
  label: string;
  sublabel?: string;
  quantity: number;
  onChange: (next: number) => void;
  min?: number;
  accent?: boolean;
  badge?: string;
}

export function QuantityStepperTag({
  icon,
  label,
  sublabel,
  quantity,
  onChange,
  min = 0,
  accent,
  badge,
}: QuantityStepperTagProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border p-3",
        accent ? "border-emerald-200 bg-emerald-50/60" : "border-slate-100 bg-white",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-base">{icon}</span>}
          <span className={cn("truncate text-sm font-medium", accent ? "text-emerald-700" : "text-slate-800")}>{label}</span>
          {badge && (
            <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">{badge}</span>
          )}
        </div>
        {sublabel && <p className="truncate text-xs text-slate-400">{sublabel}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, quantity - 1))}
          aria-label={`减少${label}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-500 transition active:scale-90"
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-semibold text-slate-800">{quantity}</span>
        <button
          type="button"
          onClick={() => onChange(quantity + 1)}
          aria-label={`增加${label}`}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-lg text-emerald-600 transition active:scale-90"
        >
          +
        </button>
      </div>
    </div>
  );
}
