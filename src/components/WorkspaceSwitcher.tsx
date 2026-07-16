import Link from "next/link";
import { cn } from "@/lib/utils";

/** The single bridge between the Customer and Coach route trees for a
 * dual-capability account. Product-facing language only — "我的 Journey" /
 * "教练工作台", never role/permission/capability terms. Switching is a plain
 * link between trees, so it never logs the user out. */
export function WorkspaceSwitcher({ current }: { current: "customer" | "coach" }) {
  return (
    <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
      <Link
        href="/customer"
        aria-current={current === "customer" ? "page" : undefined}
        className={cn(
          "flex-1 rounded-full px-3 py-1.5 text-center transition",
          current === "customer" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
        )}
      >
        🌱 我的 Journey
      </Link>
      <Link
        href="/coach"
        aria-current={current === "coach" ? "page" : undefined}
        className={cn(
          "flex-1 rounded-full px-3 py-1.5 text-center transition",
          current === "coach" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
        )}
      >
        🌿 教练工作台
      </Link>
    </div>
  );
}
