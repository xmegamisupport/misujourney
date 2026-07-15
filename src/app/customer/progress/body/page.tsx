"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useBodyProgressHomeState } from "@/lib/bodyProgress/hooks";
import { BODY_PROGRESS_CTA_LABEL, bodyProgressCtaHref } from "@/lib/bodyProgress/engine";

function formatMonthDay(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${Number(month)}月${Number(day)}日`;
}

/** The single status + single CTA hub — "the system decides", never a
 * choice between multiple Body Progress actions. resolveBodyProgressCta()
 * (Sprint 003 engine addition) is the one place that decides which of the
 * five states applies; this page and the Dashboard card both just render
 * whatever it returns. */
export default function BodyProgressHomePage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: journey } = useJourneySummary(customerId);
  const { loading, history, dueState, cta } = useBodyProgressHomeState(customerId);
  const latest = history[0];

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="身形记录" subtitle={`Journey Day ${journey?.currentDay ?? 1}`} backHref="/customer/progress" />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="第一次记录" value={dueState.firstRecordCompleted ? "已完成" : "尚未完成"} icon="🏁" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="最近一次记录" value={latest ? formatMonthDay(latest.submittedAt) : "—"} icon="🗓️" accent="bg-sky-50 text-sky-600" />
      </div>

      {dueState.firstRecordCompleted && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600 shadow-sm">
          {dueState.isOverdue || (dueState.daysRemaining ?? 0) <= 0 ? "现在可以记录你的身形进度了" : `距离下一次记录还有 ${dueState.daysRemaining} 天`}
        </div>
      )}

      {!dueState.firstRecordCompleted && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm leading-relaxed text-slate-700">
          还没有记录起点也没关系，随时可以开始。这不是评分，只是为未来的自己留下一个参考。
        </div>
      )}

      {!loading && (
        <Link
          href={bodyProgressCtaHref(cta)}
          className="rounded-2xl bg-emerald-500 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        >
          {BODY_PROGRESS_CTA_LABEL[cta.kind]}
        </Link>
      )}

      {history.length > 0 && (
        <Link href="/customer/progress/body/history" className="text-center text-sm text-sky-600">
          查看全部记录 →
        </Link>
      )}
    </div>
  );
}
