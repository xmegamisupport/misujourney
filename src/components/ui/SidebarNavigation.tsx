"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface SidebarNavigationProps {
  items: NavItem[];
  roleLabel: string;
  activeText?: string;
  activeBg?: string;
  footer?: React.ReactNode;
}

function isActive(pathname: string, href: string) {
  if (href === "/customer" || href === "/coach" || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNavigation({
  items,
  roleLabel,
  activeText = "text-emerald-700",
  activeBg = "bg-emerald-50",
  footer,
}: SidebarNavigationProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-100 bg-white md:flex">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="text-2xl">🌱</span>
        <div>
          <p className="text-sm font-semibold text-slate-900">MISU Journey</p>
          <p className="text-xs text-slate-400">{roleLabel}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? cn(activeBg, activeText) : "text-slate-500 hover:bg-slate-50",
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {footer && <div className="border-t border-slate-100 p-4">{footer}</div>}
    </aside>
  );
}
