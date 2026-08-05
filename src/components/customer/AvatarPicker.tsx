"use client";

import { AVATAR_LIST } from "@/lib/avatars";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

/**
 * Bottom-sheet grid for choosing a Fabibee avatar. Presentational only — the
 * parent owns the open state, current selection, and persistence.
 */
export function AvatarPicker({
  current,
  onPick,
  onClose,
}: {
  current?: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button aria-label="关闭" onClick={onClose} className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-t-card border border-line bg-surface p-5 shadow-elev2 sm:rounded-card">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">选择头像</h2>
          <button onClick={onClose} className="text-sm text-ink-faint hover:text-ink-soft">
            关闭
          </button>
        </div>
        <p className="mb-4 text-xs text-ink-soft">选一个陪你走 Journey 的 Fabibee。</p>

        <div className="grid grid-cols-4 gap-3">
          {AVATAR_LIST.map((a) => {
            const active = a.id === current;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onPick(a.id)}
                className="flex flex-col items-center gap-1"
                aria-pressed={active}
              >
                <span
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full bg-canvas transition",
                    active ? "ring-2 ring-brand ring-offset-2 ring-offset-surface" : "ring-1 ring-line",
                  )}
                >
                  <Avatar value={a.id} />
                </span>
                <span className={cn("text-[11px]", active ? "font-semibold text-brand-deep" : "text-ink-soft")}>{a.nameZh}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
