"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useCurrentCustomerGoal } from "@/lib/goals/hooks";
import { useHasInventoryRecords, useTodayCheckIn } from "@/lib/inventory/hooks";
import { initializeLegacyBalance, submitCheckIn, editCheckIn, deleteCheckIn, todayDateStr } from "@/lib/inventory/engine";
import { parseNonNegativeInt } from "@/lib/inventory/validation";
import { CheckInSummaryCard } from "@/components/inventory/CheckInSummaryCard";
import type { DailyCheckIn } from "@/lib/inventory/types";

function formatSleepDuration(bedtime: string, wakeTime: string): string {
  if (!bedtime || !wakeTime) return "";
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  const bedMinutes = bh * 60 + bm;
  const wakeMinutes = wh * 60 + wm;
  let diff = wakeMinutes - bedMinutes;
  if (diff <= 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
}

export default function DailyCheckinPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: journey } = useJourneySummary(customerId);
  const { data: currentGoal } = useCurrentCustomerGoal(customerId);
  const { data: hasInventory, loading: hasInventoryLoading } = useHasInventoryRecords(customerId);
  const { data: todayCheckIn, loading: todayCheckInLoading } = useTodayCheckIn(customerId);

  const lastWeight = journey?.latestWeight ?? journey?.startWeight ?? null;
  const stageGoalLabel =
    currentGoal && currentGoal.stageGoalWeightMin < currentGoal.baseWeightKg
      ? currentGoal.stageGoalWeightMin === currentGoal.stageGoalWeightMax
        ? `${currentGoal.stageGoalWeightMin}kg`
        : `${currentGoal.stageGoalWeightMin}~${currentGoal.stageGoalWeightMax}kg`
      : null;

  // ---------- Legacy customer: no inventory records yet ----------
  const [legacyN, setLegacyN] = useState("0");
  const [legacyDX, setLegacyDX] = useState("0");
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [legacySubmitting, setLegacySubmitting] = useState(false);

  if (hasInventoryLoading || todayCheckInLoading || !user) {
    return <div className="px-4 py-10 text-center text-sm text-slate-400">加载中...</div>;
  }

  if (!hasInventory) {
    return (
      <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
        <PageHeader title="请先更新你的 MISU 产品库存" backHref="/customer" />
        <p className="text-sm text-slate-500">
          我们需要先知道你目前手上还有多少包 MISU 产品，才能开始帮你追踪每天的使用量。请填写目前实际剩余的包数（不是购买时的盒数）。
        </p>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const n = parseNonNegativeInt(legacyN);
            const dx = parseNonNegativeInt(legacyDX);
            if (n === null || dx === null) {
              setLegacyError("剩余包数只能填写 0 或正整数");
              return;
            }
            setLegacySubmitting(true);
            const result = await initializeLegacyBalance(customerId, { MISU_N_PLUS: n, MISU_DX_PLUS: dx });
            setLegacySubmitting(false);
            if (!result.ok) {
              setLegacyError(result.error ?? "初始化失败，请重试");
              return;
            }
            setLegacyError(null);
          }}
        >
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              MISU N+ 代餐剩余多少包？
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={legacyN}
                onChange={(e) => setLegacyN(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              MISU DX+ 排毒剩余多少包？
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={legacyDX}
                onChange={(e) => setLegacyDX(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>
          {legacyError && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{legacyError}</div>
          )}
          <button
            type="submit"
            disabled={legacySubmitting}
            className="rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {legacySubmitting ? "保存中..." : "保存并继续打卡"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <CheckInForm
      customerId={customerId}
      streakDays={journey?.streakDays ?? 0}
      currentDay={journey?.currentDay ?? 1}
      planLength={journey?.planLength ?? 30}
      lastWeight={lastWeight}
      stageGoalLabel={stageGoalLabel}
      todayCheckIn={todayCheckIn}
    />
  );
}

function CheckInForm({
  customerId,
  streakDays,
  currentDay,
  planLength,
  lastWeight,
  stageGoalLabel,
  todayCheckIn,
}: {
  customerId: string;
  streakDays: number;
  currentDay: number;
  planLength: number;
  lastWeight: number | null;
  stageGoalLabel: string | null;
  todayCheckIn: DailyCheckIn | undefined;
}) {
  const [editing, setEditing] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [checkInId] = useState(() => crypto.randomUUID());

  const record = todayCheckIn;

  const [weight, setWeight] = useState(record?.weight.toString() ?? lastWeight?.toString() ?? "");
  const [bedtime, setBedtime] = useState(record?.bedtime ?? "23:00");
  const [wakeTime, setWakeTime] = useState(record?.wakeTime ?? "07:00");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sleepDuration = formatSleepDuration(bedtime, wakeTime);

  function resetFormToRecord(rec: DailyCheckIn) {
    setWeight(rec.weight.toString());
    setBedtime(rec.bedtime);
    setWakeTime(rec.wakeTime);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const weightNum = Number(weight);
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      setError("请输入有效的体重");
      return;
    }

    if (record && editing) {
      const result = await editCheckIn(customerId, record.id, { date: record.date, weight: weightNum, bedtime, wakeTime });
      if (!result.ok) {
        setError(result.error ?? "更新失败，请重试");
        return;
      }
      setEditing(false);
      return;
    }

    const result = await submitCheckIn({
      id: checkInId,
      customerId,
      date: todayDateStr(),
      weight: weightNum,
      bedtime,
      wakeTime,
    });
    if (!result.ok) {
      setError(result.error ?? "打卡失败，请重试");
      return;
    }
    setJustSubmitted(true);
  }

  async function handleDelete() {
    if (!record) return;
    const result = await deleteCheckIn(customerId, record.id);
    if (!result.ok) {
      setError(result.error ?? "删除失败，请重试");
      return;
    }
    setDeleting(false);
  }

  // ---------- Celebration screen right after a fresh submit ----------
  if (justSubmitted && !editing) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">✅</span>
        <p className="text-lg font-semibold text-slate-900">今日打卡完成！</p>
        <p className="text-sm text-slate-500">已连续打卡 {streakDays + 1} 天，继续保持 🌱</p>
        <Link
          href="/customer"
          className="mt-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          返回首页
        </Link>
      </div>
    );
  }

  // ---------- Already checked in today: summary + edit/delete ----------
  if (record && !editing) {
    return (
      <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
        <PageHeader title="每日体重打卡" subtitle={`Day ${currentDay} / ${planLength}`} backHref="/customer" />

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <span>✅</span>今日已打卡
          </p>
          <CheckInSummaryCard record={record} />
        </div>

        {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              resetFormToRecord(record);
              setEditing(true);
              setError(null);
            }}
            className="rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
          >
            编辑打卡
          </button>
          {!deleting ? (
            <button
              type="button"
              onClick={() => setDeleting(true)}
              className="rounded-xl border border-rose-100 bg-rose-50 py-3 text-sm font-semibold text-rose-500 transition hover:bg-rose-100"
            >
              删除打卡
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
            >
              确认删除？
            </button>
          )}
        </div>

        <Link
          href="/customer/checkin/history"
          className="rounded-xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600"
        >
          查看晨重历史
        </Link>
      </div>
    );
  }

  // ---------- Form: new check-in, or editing an existing one ----------
  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader
        title="每日体重打卡"
        subtitle={`Day ${currentDay} / ${planLength}`}
        backHref="/customer"
        action={
          editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="text-sm font-medium text-slate-400"
            >
              取消编辑
            </button>
          ) : undefined
        }
      />

      <p className="-mt-2 text-sm text-slate-500">记录今天的晨重与昨晚睡眠</p>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            今日体重 (kg)
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          {(lastWeight !== null || stageGoalLabel) && (
            <p className="mt-2 text-xs text-slate-400">
              {lastWeight !== null && `上次记录 ${lastWeight}kg`}
              {lastWeight !== null && stageGoalLabel && " · "}
              {stageGoalLabel && `目标 ${stageGoalLabel}`}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-1.5 text-sm text-slate-600">
            <span>😴</span>睡眠时间
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              昨晚入睡时间
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-slate-500">
              今天起床时间
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>
          {sleepDuration && <p className="mt-2 text-xs text-slate-400">共睡眠 {sleepDuration}</p>}
        </div>

        {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

        <button
          type="submit"
          className="rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        >
          {editing ? "保存修改" : "完成打卡"}
        </button>
      </form>
    </div>
  );
}
