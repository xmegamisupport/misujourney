"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { allCustomers, adminCoaches } from "@/lib/mock-data";

export default function CustomerCoachBindingPage() {
  const [bindings, setBindings] = useState<Record<string, string>>(
    Object.fromEntries(allCustomers.map((c) => [c.id, c.coachId])),
  );

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="Customer-Coach Binding" subtitle="管理顾客与教练的对应关系" />

      <div className="flex flex-col gap-2">
        {allCustomers.map((c) => (
          <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-lg">{c.avatar}</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">Day {c.currentDay}/{c.planLength}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={bindings[c.id]}
                onChange={(e) => setBindings((prev) => ({ ...prev, [c.id]: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                {adminCoaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-xl bg-violet-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet-600"
              >
                保存
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
