"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { SignOutButton } from "@/components/SignOutButton";
import { cn } from "@/lib/utils";

interface CmsNavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

/** Exactly the 5 menu items the spec allows — "后台功能越少越好". This is a
 * dedicated shell, not RoleShell, since Admin/Coach already have their own
 * full nav elsewhere and Nutritionist/Trainer only ever see this. */
const NAV_ITEMS: CmsNavItem[] = [
  { href: "/cms", label: "内容库", icon: "📚" },
  { href: "/cms/schedule", label: "Journey安排", icon: "🗓️" },
  { href: "/cms/pending", label: "待审核", icon: "🔍" },
  { href: "/cms/published", label: "已发布", icon: "✅" },
  { href: "/cms/permissions", label: "权限管理", icon: "🔑", adminOnly: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/cms") return pathname === "/cms";
  return pathname.startsWith(href);
}

export function CmsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthUser();
  const isAdmin = user?.role === "admin";
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-56 md:flex-col md:border-r md:border-slate-100 md:bg-white">
        <div className="px-5 py-6">
          <p className="text-lg font-semibold text-slate-900">📚 Knowledge CMS</p>
          <p className="text-xs text-slate-400">MISU Journey</p>
          {isAdmin && (
            <Link href="/admin" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600">
              ← 返回 Admin 后台
            </Link>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive(pathname, item.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 pb-6">
          <SignOutButton className="text-xs text-slate-400 hover:text-slate-600" />
        </div>
      </div>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <p className="text-sm font-semibold text-slate-900">📚 Knowledge CMS</p>
        {isAdmin && (
          <Link href="/admin" className="text-xs font-medium text-slate-400 hover:text-slate-600">
            ← 返回 Admin
          </Link>
        )}
      </div>

      <div className="md:pl-56">
        <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 md:px-8 md:pb-12">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-100 bg-white md:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              isActive(pathname, item.href) ? "text-emerald-600" : "text-slate-400",
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
