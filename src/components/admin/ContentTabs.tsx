"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/content/faq", label: "FAQ 管理" },
  { href: "/admin/content/guide", label: "产品指南管理" },
];

export function ContentTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition",
            pathname === tab.href ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
