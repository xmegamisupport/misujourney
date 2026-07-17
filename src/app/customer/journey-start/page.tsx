"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneyBaselineStatus } from "@/lib/baseline/hooks";
import { recordJourneyBaseline } from "@/lib/baseline/engine";
import { cn } from "@/lib/utils";

function DoneBadge() {
  return <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">已完成 ✓</span>;
}

function BaselineDataModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [weight, setWeight] = useState("");
  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const w = Number(weight);
    if (!weight || w <= 0) {
      setError("请输入有效的当前体重");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await recordJourneyBaseline({ weight: w, bedtime, wakeTime });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "保存失败，请重试");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <p className="text-lg font-semibold text-slate-900">Journey 起点资料</p>
        <p className="mt-1 text-sm text-slate-500">留下今天的起点，未来就能看见自己的改变。</p>

        <label className="mt-4 flex flex-col gap-1.5 text-sm text-slate-600">
          当前体重（kg）
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="例如 68"
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            平常入睡时间
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            平常起床时间
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        {error && <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {submitting ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JourneyStartPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { status, refresh } = useJourneyBaselineStatus(customerId);
  const [dataModalOpen, setDataModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="🌱 建立你的 Journey 起点" />

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 text-sm leading-relaxed text-slate-600">
        <p>未来每一次的改变，都会从今天开始记录。</p>
        <p className="mt-2">为了让未来的你，能够更清楚看见自己的改变，建议先完成以下两件事。</p>
      </div>

      {/* Item 1 — starting photos (reuses Body Progress capture) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">📷 Journey 起点照片</p>
            <p className="mt-1 text-xs text-slate-500">记录 前 / 左 / 右 / 后 四个角度，留下今天的样子。</p>
          </div>
          {status.photosDone && <DoneBadge />}
        </div>
        {status.photosDone ? (
          <Link
            href="/customer/progress/body"
            className="mt-4 block w-full rounded-xl border border-emerald-200 py-2.5 text-center text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
          >
            查看我的起点照片
          </Link>
        ) : (
          <Link
            href="/customer/progress/body/guide"
            className="mt-4 block w-full rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            开始拍照
          </Link>
        )}
      </div>

      {/* Item 2 — starting data */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">📊 Journey 起点资料</p>
            <p className="mt-1 text-xs text-slate-500">记录 当前体重 与 平常睡眠时间。</p>
          </div>
          {status.dataDone && <DoneBadge />}
        </div>
        <button
          type="button"
          onClick={() => setDataModalOpen(true)}
          className={cn(
            "mt-4 block w-full rounded-xl py-3 text-center text-sm font-semibold transition",
            status.dataDone
              ? "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              : "bg-emerald-500 text-white hover:bg-emerald-600",
          )}
        >
          {status.dataDone ? "更新起点资料" : "开始记录"}
        </button>
      </div>

      {status.complete ? (
        <Link
          href="/customer"
          className="rounded-xl bg-slate-900 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          起点已建立，进入 Journey →
        </Link>
      ) : (
        <Link href="/customer" className="py-1 text-center text-sm font-medium text-slate-400 transition hover:text-slate-600">
          以后再完成
        </Link>
      )}

      {dataModalOpen && (
        <BaselineDataModal
          onClose={() => setDataModalOpen(false)}
          onSaved={() => {
            setDataModalOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
