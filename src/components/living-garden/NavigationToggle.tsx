"use client";

import { cn } from "@/lib/utils";

/** The one visible way back to the MISU menu from inside Living Garden.
 *
 * Icon PLUS a Chinese word, never an icon alone — a customer over 40 must be
 * able to read what it does without having learned a symbol. It stays
 * discoverable: it settles at 35% opacity, never lower, and returns to full on
 * any tap, hover, focus, or while the menu is open. Touch target ≥ 44px; sits
 * in the bottom-left, clear of the home indicator and of the bottom nav when
 * that is showing. Mobile only — desktop keeps its sidebar. */
export function NavigationToggle({ open, active, onToggle }: { open: boolean; active: boolean; onToggle: () => void }) {
  const bright = active || open;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? "收起主菜单" : "显示主菜单"}
      aria-expanded={open}
      className={cn(
        "fixed z-50 flex min-h-[44px] items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-4 text-sm font-semibold text-slate-700 shadow-lg backdrop-blur transition-opacity duration-300 md:hidden motion-reduce:transition-none",
        bright ? "opacity-100" : "opacity-[0.35] hover:opacity-100 focus-visible:opacity-100 active:opacity-100",
      )}
      style={{
        left: "max(12px, env(safe-area-inset-left))",
        // Ride above the bottom nav when it is up; otherwise hug the safe-area
        // bottom edge, never the home indicator.
        bottom: open ? "calc(env(safe-area-inset-bottom, 0px) + 4.25rem)" : "max(12px, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <span aria-hidden="true" className="text-base leading-none">
        {open ? "✕" : "☰"}
      </span>
      {open ? "收起" : "菜单"}
    </button>
  );
}
