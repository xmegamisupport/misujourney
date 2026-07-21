"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPointValues } from "@/lib/journey-points/engine";

/** 🌱 Journey Points 说明 — how the points on the Dashboard header are earned.
 *
 * Every number here is read from journey_point_values at open, never hardcoded,
 * so the guide can never disagree with what the engine actually awards. When a
 * value is re-tuned (a single UPDATE), this page tells the truth on the next
 * visit with no code change. A missing value simply renders "—" rather than a
 * stale figure.
 *
 * The weigh-in tier is the one thing the table cannot express on its own — it is
 * two rows plus a time rule — so it is spelled out explicitly and still pulls
 * its two numbers from the same source. */
export default function PointsGuidePage() {
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    getPointValues().then((v) => {
      if (!cancelled) setValues(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const p = (action: string): string => (values[action] != null ? `+${values[action]}` : "—");

  return (
    <div className="flex flex-col gap-6 px-4 pb-8 md:px-8">
      <PageHeader title="🌱 Journey Points 说明" subtitle="每一件小事，都会累积" backHref="/customer/profile" />

      <p className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3.5 text-sm leading-relaxed text-slate-600">
        真正改变身体的，从来不是某一天做得特别好，而是很多个普通的日子，你都愿意继续完成。Journey Points
        就是用来记住这些坚持的 —— 它不是用来打分数，也不能拿它跟别人比较。
      </p>

      {/* Daily */}
      <section>
        <p className="mb-2 text-sm font-semibold text-slate-700">每天可以累积</p>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <Row icon="⚖️" label="完成今日晨重" hint="早上越早完成，加得越多" value={weighInHint(values)} />
          <Row icon="🍽️" label="完成饮食打卡" hint="一天一次" value={p("meal")} />
          <Row icon="🌙" label="完成今日回顾" value={p("reflection")} />
          <Row icon="💧" label="达成今日饮水" value={p("water")} />
          <Row icon="📚" label="完成今日学习" hint="当天有安排时" value={p("learning")} />
          <Row icon="🌱" label="完成今天全部" hint="五件都完成，额外奖励" value={p("daily_complete")} highlight />
        </div>
      </section>

      {/* Weigh-in tier, spelled out */}
      <section>
        <p className="mb-2 text-sm font-semibold text-slate-700">晨重的时间奖励</p>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <Row icon="🌅" label="早上 10 点前完成" value={p("weighin_early")} highlight />
          <Row icon="⏰" label="10 点 – 12 点完成" value={p("weighin_mid")} />
          <Row icon="🌤️" label="12 点之后完成" hint="仍然算完成任务，只是没有额外积分" value="+0" />
        </div>
        <p className="mt-2 px-1 text-xs leading-relaxed text-slate-400">
          刚起床时的体重最稳定，所以早上量会更准 —— 但什么时候量都可以，晚一点也不影响你完成今天的 Journey。
        </p>
      </section>

      {/* Consistency */}
      <section>
        <p className="mb-2 text-sm font-semibold text-slate-700">坚持的奖励</p>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <Row icon="🔥" label="过去 7 天完成 5 天" value={p("consistency_7")} />
          <Row icon="🔥" label="过去 14 天完成 10 天" value={p("consistency_14")} />
          <Row icon="🔥" label="过去 30 天完成 21 天" value={p("consistency_30")} />
          <Row icon="🔥" label="过去 60 天完成 42 天" value={p("consistency_60")} />
        </div>
        <p className="mt-2 px-1 text-xs leading-relaxed text-slate-400">
          看的是这段时间里的累积，不是连续 —— 中间休息一天也没关系，不会归零。
        </p>
      </section>

      {/* Milestones */}
      <section>
        <p className="mb-2 text-sm font-semibold text-slate-700">重要的里程碑</p>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <Row icon="🎉" label="完成 Journey 起点" value={p("baseline")} />
          <Row icon="📷" label="完成身形记录" hint="每 14 天一次" value={p("body_progress")} />
          <Row icon="🏆" label="完成第一阶段目标" value={p("stage_complete_1")} highlight />
          <Row icon="🏆" label="完成第二阶段目标" value={p("stage_complete_2")} highlight />
        </div>
      </section>
    </div>
  );
}

/** Weigh-in shows a range on the summary row, since its worth depends on the
 * hour. Falls back cleanly if either tier value is missing. */
function weighInHint(values: Record<string, number>): string {
  const early = values["weighin_early"];
  const mid = values["weighin_mid"];
  if (early == null && mid == null) return "—";
  if (early != null && mid != null) return `+${mid} ~ +${early}`;
  return `+${early ?? mid}`;
}

function Row({
  icon,
  label,
  hint,
  value,
  highlight,
}: {
  icon: string;
  label: string;
  hint?: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0">
      <span className="text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      <span className={`shrink-0 text-sm font-semibold ${highlight ? "text-emerald-600" : "text-slate-500"}`}>{value}</span>
    </div>
  );
}
