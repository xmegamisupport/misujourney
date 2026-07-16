"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { Role } from "@/lib/types";
import { roleNav, roleTheme, roleIcon } from "@/lib/nav";
import { SidebarNavigation } from "@/components/ui/SidebarNavigation";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { SignOutButton } from "@/components/SignOutButton";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { cn } from "@/lib/utils";

interface RoleShellProps {
  role: Role;
  children: ReactNode;
}

export function RoleShell({ role, children }: RoleShellProps) {
  const { t } = useLanguage();
  const { user } = useAuthUser();
  const navKeys = t.nav[role] as Record<string, string>;
  const items = roleNav[role].map((item) => ({ ...item, label: navKeys[item.key] ?? item.label }));
  const label = t.roleLabel[role];
  const theme = roleTheme[role];

  // The switcher bridges the two trees only for a genuine dual-capability
  // account (a Customer who also has Coach access), and only inside those two
  // areas. Per-area navigation stays untouched — the switcher is the only
  // bridge between them.
  const showSwitcher = !!user?.isCoach && user?.role === "customer" && (role === "customer" || role === "coach");

  return (
    <div className="min-h-screen bg-slate-50">
      <SidebarNavigation
        items={items}
        roleLabel={label}
        roleIcon={roleIcon[role]}
        activeText={theme.activeText}
        activeBg={theme.activeBg}
        footer={<SignOutButton className="text-xs text-slate-400 hover:text-slate-600" />}
      />
      <div className="md:pl-64">
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur md:hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <span className="relative block h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-50">
              <Image src={roleIcon[role]} alt="" fill sizes="28px" className="object-cover object-top" />
            </span>
            <span className="text-sm font-semibold text-slate-900">MISU Journey</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", theme.chip)}>{label}</span>
          </div>
          {showSwitcher && (
            <div className="border-b border-slate-100 px-4 py-2">
              <WorkspaceSwitcher current={role as "customer" | "coach"} />
            </div>
          )}
        </div>
        {showSwitcher && (
          <div className="sticky top-0 z-20 hidden border-b border-slate-100 bg-white/90 px-4 py-2 backdrop-blur md:block">
            <div className="mx-auto max-w-5xl">
              <div className="w-full max-w-xs">
                <WorkspaceSwitcher current={role as "customer" | "coach"} />
              </div>
            </div>
          </div>
        )}
        <main className="mx-auto min-h-screen max-w-5xl pb-24 pt-6 md:pb-12">{children}</main>
      </div>
      <BottomNavigation items={items} activeText={theme.activeText} />
    </div>
  );
}
