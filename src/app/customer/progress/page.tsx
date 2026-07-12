import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { TrendChart } from "@/components/ui/TrendChart";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { currentCustomer } from "@/lib/mock-data";

export default function ProgressPage() {
  const c = currentCustomer;
  const weightLost = +(c.startWeight - c.currentWeight).toFixed(1);
  const waistLost = +(c.startWaist - c.currentWaist).toFixed(1);
  const totalToLose = +(c.startWeight - c.targetWeight).toFixed(1);
  const goalPercent = Math.round((weightLost / totalToLose) * 100);

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="我的成长" subtitle={`Day ${c.currentDay} / ${c.planLength}`} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="起始体重" value={c.startWeight} unit="kg" accent="bg-slate-100 text-slate-500" />
        <StatCard label="当前体重" value={c.currentWeight} unit="kg" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="目标体重" value={c.targetWeight} unit="kg" accent="bg-sky-50 text-sky-600" />
      </div>

      <ProgressCard
        label="目标达成进度"
        percent={goalPercent}
        icon="🎯"
        sublabel={`已减重 ${weightLost}kg，距离目标还差 ${(c.currentWeight - c.targetWeight).toFixed(1)}kg`}
      />

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-700">体重趋势</p>
        <TrendChart data={c.weightTrend} unit="kg" strokeClass="text-emerald-500" fillId="progress-weight" />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">腰围趋势</p>
          <span className="text-xs text-emerald-600">已减少 {waistLost}cm</span>
        </div>
        <TrendChart data={c.waistTrend} unit="cm" strokeClass="text-sky-500" fillId="progress-waist" />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-700">MISU Score 趋势</p>
        <TrendChart data={c.scoreTrend} strokeClass="text-amber-500" fillId="progress-score" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="打卡率" value={`${c.checkinRate}%`} icon="✅" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="连续打卡" value={c.streakDays} unit="天" icon="🔥" accent="bg-amber-50 text-amber-600" />
      </div>
    </div>
  );
}
