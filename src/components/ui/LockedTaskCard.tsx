interface LockedTaskCardProps {
  icon: string;
  label: string;
  hint: string;
}

/** A task card that isn't available yet (Journey Day not active) — same
 * icon/label shape as its unlocked counterpart, but dimmed, non-interactive,
 * and marked with a lock instead of a checkbox or action button. */
export function LockedTaskCard({ icon, label, hint }: LockedTaskCardProps) {
  return (
    <div className="flex cursor-not-allowed items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 opacity-50 [&_*]:pointer-events-none">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
      <span className="shrink-0 text-lg text-slate-300">🔒</span>
    </div>
  );
}
