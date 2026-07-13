"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScoreCircle } from "@/components/ui/ScoreCircle";
import { StatCard } from "@/components/ui/StatCard";
import { TaskCard } from "@/components/ui/TaskCard";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useWaterIntake } from "@/lib/daily-progress";
import { useTodayMeals, useTodayCheckIn, useCustomerTransactions } from "@/lib/inventory/hooks";
import { todayDateStr } from "@/lib/inventory/engine";
import type { DailyTask } from "@/lib/types";

const DEFAULT_WATER_TARGET_ML = 2000;

export default function DailySummaryPage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: journey } = useJourneySummary(customerId);
  const [reflection, setReflection] = useState("");
  const [done, setDone] = useState(false);
  const { data: addedMeals } = useTodayMeals(customerId);
  const { data: todayCheckIn } = useTodayCheckIn(customerId);
  const { data: transactions } = useCustomerTransactions(customerId);
  const water = useWaterIntake(customerId, 0, DEFAULT_WATER_TARGET_ML);
  const today = todayDateStr();

  const todayMisuScore = addedMeals.length > 0 ? Math.round(addedMeals.reduce((sum, m) => sum + m.misuScore, 0) / addedMeals.length) : 0;

  const tasks: DailyTask[] = [
    { id: "checkin", title: "每日体重打卡", description: "体重 + 状态记录", done: Boolean(todayCheckIn), icon: "⚖️" },
    { id: "meals", title: "211 餐盘记录", description: `已记录 ${addedMeals.length} 餐`, done: addedMeals.length > 0, icon: "🍽️" },
    { id: "water", title: `喝水 ${DEFAULT_WATER_TARGET_ML}ml`, description: `已完成 ${water}ml`, done: water >= DEFAULT_WATER_TARGET_ML, icon: "💧" },
    {
      id: "misu",
      title: "MISU 产品打卡",
      description: "记录今日 MISU 使用",
      done: transactions.some((t) => t.createdAt.slice(0, 10) === today && (t.type === "MEAL_USAGE" || t.type === "CHECK_IN_USAGE")),
      icon: "🥤",
    },
  ];
  const doneTasks = tasks.filter((t) => t.done).length;
  const completionRate = Math.round((doneTasks / tasks.length) * 100);
  const mealTypesLogged = new Set(addedMeals.map((m) => m.type)).size;

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20 text-center">
        <span className="text-5xl">🌱</span>
        <p className="text-lg font-semibold text-slate-900">今日总结已完成！</p>
        <p className="text-sm text-slate-500">Every Day Is A New Journey，明天继续加油</p>
        <Link
          href="/customer"
          className="mt-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="今日总结" subtitle={`Day ${journey?.currentDay ?? 1} / ${journey?.planLength ?? 30}`} backHref="/customer" />

      <div className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-sky-50 p-5">
        <ScoreCircle value={todayMisuScore} label="MISU Score" colorClass="text-emerald-500" trackClass="text-white/70" />
        <p className="text-sm text-slate-600">
          今天你完成了 {doneTasks}/{tasks.length} 项任务，饮食记录 {mealTypesLogged} 餐。做得很好，继续保持这份坚持！
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="今日完成率" value={`${completionRate}%`} icon="✅" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="连续打卡" value={journey?.streakDays ?? 0} unit="天" icon="🔥" accent="bg-amber-50 text-amber-600" />
        <StatCard label="任务完成" value={`${doneTasks}/${tasks.length}`} icon="📋" accent="bg-sky-50 text-sky-600" />
        <StatCard label="饮食记录" value={mealTypesLogged} unit="餐" icon="🍽️" accent="bg-rose-50 text-rose-500" />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">今日任务回顾</p>
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1.5 text-sm text-slate-600">
          今天感觉如何？ · 选填
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={3}
            placeholder="写下今天的心情或收获"
            className="resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setDone(true)}
        className="rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        提交今日总结
      </button>
    </div>
  );
}
