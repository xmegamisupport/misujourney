"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAllUsersForAdmin } from "@/lib/admin/users";
import { cn } from "@/lib/utils";
import type { InspectionReport, InspectionRow } from "@/lib/discovery/inspector";

type StatusFilter = "all" | "unlocked" | "locked";

const rarityStyle: Record<string, string> = {
  legendary: "bg-amber-50 text-amber-700 border-amber-200",
  epic: "bg-violet-50 text-violet-700 border-violet-200",
  rare: "bg-sky-50 text-sky-700 border-sky-200",
  common: "bg-slate-50 text-slate-600 border-slate-200",
};

function Json({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-slate-900/95 p-2 text-[11px] leading-relaxed text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function ProgressBar({ percent }: { percent: number | null }) {
  if (percent == null) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={cn("h-full rounded-full", percent >= 100 ? "bg-emerald-500" : "bg-sky-400")}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-xs text-slate-700">{children}</div>
    </div>
  );
}

function RowCard({ row }: { row: InspectionRow }) {
  const unlocked = row.status === "unlocked";
  return (
    <div className={cn("rounded-2xl border bg-white p-4 shadow-sm", unlocked ? "border-emerald-200" : "border-slate-100")}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{row.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">{row.name}</span>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{row.discoveryId}</code>
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", rarityStyle[row.rarity] ?? rarityStyle.common)}>
              {row.rarity}
            </span>
            {!row.enabled && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">disabled</span>
            )}
            {!row.supported && (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-600">unsupported</span>
            )}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
            unlocked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
          )}
        >
          {unlocked ? "UNLOCKED" : "LOCKED"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Trigger">
          <code className="text-[11px]">{row.triggerType}</code>
        </Field>
        <Field label="Eval">
          <span className={row.evaluation.met ? "text-emerald-600" : "text-slate-500"}>
            {row.evaluation.met ? "met ✓" : "not met"} · {row.evaluation.supported ? "supported" : "unsupported"}
          </span>
        </Field>
        <Field label="Scope">{row.unlockScope}</Field>
        <Field label="Registry ver">{row.registryVersion}</Field>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Trigger progress</p>
          <span className="text-xs text-slate-600">{row.progress}</span>
        </div>
        <ProgressBar percent={row.progressPercent} />
      </div>

      {row.whyLocked && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <span className="font-semibold">Why locked:</span> {row.whyLocked}
        </p>
      )}

      {row.unlock && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-emerald-50/60 p-3 md:grid-cols-4">
          <Field label="Unlocked at">{row.unlock.unlockedAt?.slice(0, 19).replace("T", " ")}</Field>
          <Field label="Source event">{row.unlock.sourceEvent ?? "—"}</Field>
          <Field label="Reg ver @ unlock">{row.unlock.registryVersion ?? "—"}</Field>
          <Field label="Queue">
            {row.queue ? `${row.queue.status} · p${row.queue.priority}` : "—"}
          </Field>
        </div>
      )}

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-slate-400 hover:text-slate-600">condition · evaluation · evidence</summary>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Condition</p>
            <Json value={row.condition} />
          </div>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Evaluation</p>
            <Json value={row.evaluation} />
          </div>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Trigger evidence (stored)</p>
            <Json value={row.unlock?.triggerEvidence ?? null} />
          </div>
        </div>
      </details>
    </div>
  );
}

export default function DiscoveryInspectorPage() {
  const { data: users, loading: usersLoading } = useAllUsersForAdmin();
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customers = useMemo(
    () =>
      users
        .filter((u) => u.role === "customer")
        .filter((u) => u.name.includes(query) || (u.email ?? "").includes(query)),
    [users, query],
  );

  async function inspect(id: string) {
    setUserId(id);
    setReport(null);
    setError(null);
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/discovery/inspect?userId=${encodeURIComponent(id)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "inspection failed");
      setReport(body.report as InspectionReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "inspection failed");
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(
    () => (report?.rows ?? []).filter((r) => status === "all" || r.status === status),
    [report, status],
  );

  return (
    <div className="flex flex-col gap-4 px-4 pb-10 md:px-8">
      <PageHeader title="🔍 Discovery Inspector" subtitle="内部调试工具 · Internal support tool (admin only)" />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:flex-row md:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-slate-500">Filter customers</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索姓名或邮箱"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-slate-500">Customer ({usersLoading ? "…" : customers.length})</label>
          <select
            value={userId}
            onChange={(e) => inspect(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
          >
            <option value="">— select a customer —</option>
            {customers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.email ? `· ${u.email}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Evaluating all discoveries…</p>}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}

      {report && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
            <span className="font-semibold text-slate-700">Registry v{report.registryVersion}</span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-600">{report.counts.unlocked} unlocked</span>
            <span className="text-slate-500">{report.counts.locked} locked</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{report.counts.supported} supported / {report.counts.unsupported} unsupported</span>
            {!report.snapshotAvailable && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">no snapshot (not a customer / no data)</span>
            )}
            <div className="ml-auto flex gap-1">
              {(["all", "unlocked", "locked"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
                    status === s ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {rows.map((r) => (
              <RowCard key={r.discoveryId} row={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
