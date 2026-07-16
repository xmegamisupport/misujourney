import type { CoachImpact } from "@/lib/coach/workspace-types";

/** "My Impact" — encouraging, non-KPI coaching statistics. Helps the Coach
 * see the positive change they've created. Never a ranking or performance
 * score. */
export function MyImpact({ impact }: { impact: CoachImpact }) {
  const stats: { icon: string; label: string; value: number }[] = [
    { icon: "👥", label: "我的顾客", value: impact.totalCustomers },
    { icon: "🌱", label: "活跃旅程", value: impact.activeJourney },
    { icon: "🏁", label: "已完成旅程", value: impact.journeysCompleted },
    { icon: "⏸", label: "已暂停", value: impact.journeysPaused },
    { icon: "🎉", label: "本月完成", value: impact.journeysCompletedThisMonth },
  ];

  return (
    <section>
      <p className="mb-2 text-sm font-semibold text-slate-700">我的影响力</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
            <p className="text-xl" aria-hidden>
              {s.icon}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
