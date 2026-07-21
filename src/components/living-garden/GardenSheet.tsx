"use client";

import type { ReactNode } from "react";

/** A bottom sheet that keeps the garden visible behind it.
 *
 * Journey Points, Badges and Rewards are deliberately NOT pages: opening one
 * must never take the customer OUT of her garden. So this is a low sheet over a
 * light scrim — the world stays on screen above it, and closing returns her to
 * exactly where she was. Content is a placeholder this sprint; the shell is the
 * deliverable. */
export function GardenSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      {/* Scrim is intentionally light — the garden should still read through it. */}
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 bg-slate-900/20" />
      <div className="relative max-h-[62%] overflow-y-auto rounded-t-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-semibold text-slate-800">{title}</p>
          <button type="button" onClick={onClose} className="text-xs font-medium text-slate-400">
            关闭
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Placeholder body shared by the not-yet-built overlays, so each one reads as
 * "coming, and it lives here inside the garden" rather than as an empty modal. */
export function GardenSheetPlaceholder({ emoji, line }: { emoji: string; line: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="text-4xl">{emoji}</span>
      <p className="max-w-xs text-sm leading-relaxed text-slate-500">{line}</p>
    </div>
  );
}
