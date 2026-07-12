"use client";

import type { ReactNode } from "react";
import type { Role } from "@/lib/types";
import { roleNav, roleTheme } from "@/lib/nav";
import { SidebarNavigation } from "@/components/ui/SidebarNavigation";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { SignOutButton } from "@/components/SignOutButton";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { cn } from "@/lib/utils";

interface RoleShellProps {
  role: Role;
  children: ReactNode;
}

export function RoleShell({ role, children }: RoleShellProps) {
  const { t } = useLanguage();
  const navKeys = t.nav[role] as Record<string, string>;
  const items = roleNav[role].map((item) => ({ ...item, label: navKeys[item.key] ?? item.label }));
  const label = t.roleLabel[role];
  const theme = roleTheme[role];

  return (
    <div className="min-h-screen bg-slate-50">
      <SidebarNavigation
        items={items}
        roleLabel={label}
        activeText={theme.activeText}
        activeBg={theme.activeBg}
        footer={<SignOutButton className="text-xs text-slate-400 hover:text-slate-600" />}
      />
      <div className="md:pl-64">
        <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <span className="text-xl">🌱</span>
          <span className="text-sm font-semibold text-slate-900">MISU Journey</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", theme.chip)}>{label}</span>
        </div>
        <main className="mx-auto min-h-screen max-w-5xl pb-24 pt-6 md:pb-12">{children}</main>
      </div>
      <BottomNavigation items={items} activeText={theme.activeText} />
    </div>
  );
}
