import type { ReactNode } from "react";
import Link from "next/link";
import type { Role } from "@/lib/types";
import { roleNav, roleLabel, roleTheme } from "@/lib/nav";
import { SidebarNavigation } from "@/components/ui/SidebarNavigation";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { cn } from "@/lib/utils";

interface RoleShellProps {
  role: Role;
  children: ReactNode;
}

export function RoleShell({ role, children }: RoleShellProps) {
  const items = roleNav[role];
  const label = roleLabel[role];
  const theme = roleTheme[role];

  return (
    <div className="min-h-screen bg-slate-50">
      <SidebarNavigation
        items={items}
        roleLabel={label}
        activeText={theme.activeText}
        activeBg={theme.activeBg}
        footer={
          <div className="flex items-center justify-between">
            <RoleSwitcher compact />
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
              退出 Demo
            </Link>
          </div>
        }
      />
      <div className="md:pl-64">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌱</span>
            <span className="text-sm font-semibold text-slate-900">MISU Journey</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", theme.chip)}>{label}</span>
          </div>
          <RoleSwitcher compact />
        </div>
        <div className="hidden justify-end px-8 pt-6 md:flex">
          <RoleSwitcher />
        </div>
        <main className="mx-auto min-h-screen max-w-5xl pb-24 md:pb-12">{children}</main>
      </div>
      <BottomNavigation items={items} activeText={theme.activeText} />
    </div>
  );
}
