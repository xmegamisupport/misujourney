import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { adminCoaches } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function CoachManagementPage() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader
        title="Coach Management"
        subtitle={`共 ${adminCoaches.length} 位教练`}
        action={
          <Link
            href="/admin/binding"
            className="rounded-xl border border-violet-200 px-3.5 py-2 text-xs font-medium text-violet-600 transition hover:bg-violet-50"
          >
            顾客绑定管理
          </Link>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        {adminCoaches.map((coach) => (
          <div key={coach.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-50 text-2xl">
              {coach.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-800">{coach.name}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    coach.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400",
                  )}
                >
                  {coach.status === "active" ? "在职" : "停用"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {coach.customers} 位顾客 · 本周活跃 {coach.activeThisWeek} · ★ {coach.rating}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
