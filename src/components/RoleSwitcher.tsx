"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { roleHome } from "@/lib/nav";
import { cn } from "@/lib/utils";

const roles: { role: Role; label: string; icon: string }[] = [
  { role: "customer", label: "Customer", icon: "🌸" },
  { role: "coach", label: "Coach", icon: "🌿" },
  { role: "admin", label: "Admin", icon: "🛡️" },
];

function currentRole(pathname: string): Role | null {
  if (pathname.startsWith("/customer")) return "customer";
  if (pathname.startsWith("/coach")) return "coach";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}

interface RoleSwitcherProps {
  compact?: boolean;
}

export function RoleSwitcher({ compact = false }: RoleSwitcherProps) {
  const pathname = usePathname();
  const active = currentRole(pathname);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-1",
        compact ? "text-xs" : "text-sm",
      )}
      title="Demo Role Switcher"
    >
      {roles.map(({ role, label, icon }) => (
        <Link
          key={role}
          href={roleHome[role]}
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition",
            active === role ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600",
          )}
        >
          <span>{icon}</span>
          {!compact && <span>{label}</span>}
        </Link>
      ))}
    </div>
  );
}
