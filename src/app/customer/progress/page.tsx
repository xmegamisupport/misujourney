"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { TrendChart } from "@/components/ui/TrendChart";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useCurrentCustomerGoal } from "@/lib/goals/hooks";
import { useCustomerCheckIns } from "@/lib/inventory/hooks";
import { useLatestCustomerInsight } from "@/lib/insights/hooks";
import type { TrendPoint } from "@/lib/types";

export default function ProgressPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: journey } = useJourneySummary(customerId);
  const { data: currentGoal } = useCurrentCustomerGoal(customerId);
  const { data: checkIns } = useCustomerCheckIns(customerId);
  const { data: weeklyInsight } = useLatestCustomerInsight(customerId, "weekly_7_day");

  const currentDay = journey?.currentDay ?? 1;
  const planLength = journey?.planLength ?? 30;
  const startWeight = journey?.startWeight ?? null;
  const currentWeight = journey?.latestWeight ?? startWeight;
  const weightTrendData: TrendPoint[] = [...checkIns].reverse().map((ci) => ({ label: ci.date.slice(5), value: ci.weight }));
  const checkinRate = currentDay > 0 ? Math.min(100, Math.round((checkIns.length / currentDay) * 100)) : 0;

  const hasWeightGoal = Boolean(currentGoal) && currentGoal!.stageGoalWeightMin < currentGoal!.baseWeightKg;
  const stageGoalMid = hasWeightGoal ? (currentGoal!.stageGoalWeightMin + currentGoal!.stageGoalWeightMax) / 2 : null;
  const weightLost = startWeight !== null && currentWeight !== null ? +(startWeight - currentWeight).toFixed(1) : null;
  const totalToLose = startWeight !== null && stageGoalMid !== null ? +(startWeight - stageGoalMid).toFixed(1) : null;
  const goalPercent = weightLost !== null && totalToLose !== null && totalToLose > 0 ? Math.max(0, Math.min(100, Math.round((weightLost / totalToLose) * 100))) : null;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="我的成长" subtitle={`Day ${currentDay} / ${planLength}`} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="起始体重" value={startWeight ?? "—"} unit={startWeight !== null ? "kg" : undefined} accent="bg-line-soft text-ink-soft" />
        <StatCard label="当前体重" value={currentWeight ?? "—"} unit={currentWeight !== null ? "kg" : undefined} accent="bg-brand-tint text-brand-deep" />
        <StatCard
          label="阶段目标"
          value={hasWeightGoal ? (currentGoal!.stageGoalWeightMin === currentGoal!.stageGoalWeightMax ? currentGoal!.stageGoalWeightMin : `${currentGoal!.stageGoalWeightMin}~${currentGoal!.stageGoalWeightMax}`) : "—"}
          unit={hasWeightGoal ? "kg" : undefined}
          accent="bg-sky-50 text-sky-600"
        />
      </div>

      {hasWeightGoal && goalPercent !== null ? (
        <ProgressCard
          label="目标达成进度"
          percent={goalPercent}
          icon="🎯"
          sublabel={weightLost !== null && weightLost > 0 ? `已减重 ${weightLost}kg` : "刚刚开始，加油！"}
        />
      ) : (
        <div className="rounded-lg border border-line bg-surface p-4 text-sm text-ink-soft shadow-elev1">
          目前专注在习惯养成，暂无体重目标。每一个阶段完成以后，再重新评估下一阶段目标。
        </div>
      )}

      <div className="rounded-lg border border-line bg-surface p-4 shadow-elev1">
        <p className="mb-1 text-sm font-semibold text-ink">体重趋势</p>
        {weightTrendData.length > 0 ? (
          <TrendChart data={weightTrendData} unit="kg" strokeClass="text-brand" fillId="progress-weight" />
        ) : (
          <p className="py-6 text-center text-sm text-ink-faint">还没有体重记录，完成第一次打卡后开始记录趋势</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="打卡率" value={`${checkinRate}%`} icon="✅" accent="bg-brand-tint text-brand-deep" />
        <StatCard label="连续打卡" value={journey?.streakDays ?? 0} unit="天" icon="🔥" accent="bg-amber-50 text-amber-600" />
      </div>

      <div className="rounded-lg border border-brand-soft/40 bg-brand-tint p-4">
        <p className="mb-1 text-sm font-semibold text-ink">🌱 本周小结</p>
        <p className="text-sm leading-relaxed text-ink-soft">
          {weeklyInsight?.customerMessage ?? "继续记录几天，我们会帮你整理更有参考价值的趋势。"}
        </p>
      </div>

      <Link
        href="/customer/progress/body"
        className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 shadow-elev1 transition duration-500 ease-soft hover:-translate-y-0.5 hover:border-brand-soft"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xl">🧍</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">身形记录</p>
          <p className="text-xs text-ink-faint">查看我的成长记录 →</p>
        </div>
      </Link>
    </div>
  );
}
