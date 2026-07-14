"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAllCustomersForAdmin, useAllCoaches } from "@/lib/coach/hooks";
import { setCustomerCoach } from "@/lib/coach/engine";

const UNASSIGNED = "";

export default function CustomerCoachBindingPage() {
  const { data: customers, loading: customersLoading, refresh } = useAllCustomersForAdmin();
  const { data: coaches, loading: coachesLoading } = useAllCoaches();

  // Only holds pending edits the user hasn't saved yet — falls back to each
  // customer's live coachId otherwise, so there's no data to keep in sync
  // with the fetched list (no effect needed).
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function handleSave(customerId: string, selected: string) {
    setSavingId(customerId);
    setErrorId(null);
    setSavedId(null);
    const result = await setCustomerCoach(customerId, selected === UNASSIGNED ? null : selected);
    setSavingId(null);
    if (!result.ok) {
      setErrorId(customerId);
      return;
    }
    setSavedId(customerId);
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[customerId];
      return next;
    });
    refresh();
  }

  const loading = customersLoading || coachesLoading;

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="Customer-Coach Binding" subtitle="管理顾客与教练的对应关系" />

      {!loading && customers.length === 0 ? (
        <EmptyState icon="🔗" title="还没有顾客账号" />
      ) : (
        <div className="flex flex-col gap-2">
          {customers.map((c) => {
            const value = overrides[c.id] ?? c.coachId ?? UNASSIGNED;
            const dirty = c.id in overrides && overrides[c.id] !== (c.coachId ?? UNASSIGNED);
            return (
              <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-lg">{c.avatar ?? "🙂"}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">
                      Day {c.currentDay}/{c.planLength}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {errorId === c.id && <span className="text-xs text-rose-500">保存失败</span>}
                  {savedId === c.id && !dirty && <span className="text-xs text-emerald-600">已保存</span>}
                  <select
                    value={value}
                    onChange={(e) => {
                      setSavedId(null);
                      setOverrides((prev) => ({ ...prev, [c.id]: e.target.value }));
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value={UNASSIGNED}>未分配</option>
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!dirty || savingId === c.id}
                    onClick={() => handleSave(c.id, value)}
                    className="rounded-xl bg-violet-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet-600 disabled:opacity-40"
                  >
                    {savingId === c.id ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
