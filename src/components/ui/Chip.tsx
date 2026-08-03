import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A glassy pill chip — the XMEGAMI parent-brand signature tag: a translucent
 * white, fully-rounded pill with a hairline border and a soft diffused shadow,
 * an optional leading icon, and a short label. Use it for section eyebrows,
 * category/mood tags, and small metadata — the airy "value chip" look.
 *
 *   <Chip icon="🌱">成长</Chip>            // glass (default)
 *   <Chip icon="✨" tone="brand">今日寄语</Chip>  // brand-pink
 */
export function Chip({
  icon,
  children,
  tone = "glass",
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: "glass" | "brand";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-elev1 backdrop-blur-sm",
        tone === "brand"
          ? "border border-brand-soft/60 bg-brand-tint text-brand-deep"
          : "border border-white/70 bg-glass text-ink",
        className,
      )}
    >
      {icon != null && <span className="text-[13px] leading-none">{icon}</span>}
      {children}
    </span>
  );
}
