"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  items: NavItem[];
  activeText?: string;
  /** Slides the bar off-screen (Living Garden immersive mode). The nav is
   * otherwise unchanged — it still works exactly as before when shown. */
  hidden?: boolean;
}

function isActive(pathname: string, href: string) {
  if (href === "/customer" || href === "/coach" || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation({ items, activeText = "text-emerald-600", hidden = false }: BottomNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-hidden={hidden}
      className={cn(
        "safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 backdrop-blur transition-transform duration-300 md:hidden motion-reduce:transition-none",
        hidden && "pointer-events-none translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition",
                active ? activeText : "text-slate-400",
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
