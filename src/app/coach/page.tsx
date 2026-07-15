"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCoachProfile } from "@/lib/coach/hooks";
import { useCoachWorkspace } from "@/lib/coach/workspace-hooks";
import { CoachGreeting } from "@/components/coach/CoachGreeting";
import { CelebrationCard } from "@/components/coach/CelebrationCard";
import { SupportCard } from "@/components/coach/SupportCard";
import { SUPPORT_CATEGORY_ORDER, SUPPORT_CATEGORY_LABELS, SUPPORT_PRIORITY_ORDER } from "@/lib/coach/workspace-config";
import type { SupportItem } from "@/lib/coach/workspace-types";

export default function CoachWorkspacePage() {
  const { user } = useAuthUser();
  const coachId = user?.id ?? "";
  const { data: coach } = useMyCoachProfile(coachId);
  const { data: workspace, loading } = useCoachWorkspace(coachId);

  // Group support by category (readability), tier-sorted within each. Celebrate
  // and Support are independent — a customer may appear in both, never
  // cross-filtered.
  const supportByCategory = useMemo(() => {
    const groups: Record<string, SupportItem[]> = {};
    for (const item of workspace.support) (groups[item.category] ??= []).push(item);
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => SUPPORT_PRIORITY_ORDER[a.priority] - SUPPORT_PRIORITY_ORDER[b.priority]);
    }
    return groups;
  }, [workspace.support]);

  const celebrateCustomerCount = useMemo(() => new Set(workspace.celebrations.map((c) => c.customerId)).size, [workspace.celebrations]);
  const allCaughtUp = !loading && workspace.celebrations.length === 0 && workspace.support.length === 0;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="教练工作台" subtitle="Every Day Is A New Journey" />

      <CoachGreeting coachName={coach?.name ?? ""} celebrateCount={celebrateCustomerCount} supportCount={workspace.support.length} />

      {allCaughtUp ? (
        <EmptyState icon="💚" title="全部照顾到了" description="今天你已经陪伴了每一位需要你的顾客。" />
      ) : (
        <>
          <section>
            <p className="mb-2 text-sm font-semibold text-slate-700">🎉 今天值得庆祝</p>
            {workspace.celebrations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400">
                今天暂时没有可以庆祝的时刻，继续陪伴你的顾客 🌱
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {workspace.celebrations.map((item) => (
                  <CelebrationCard key={`${item.customerId}-${item.type}`} item={item} />
                ))}
              </div>
            )}
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-slate-700">❤️ 可能需要你的关心</p>
            {workspace.support.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400">
                太好了，今天没有顾客需要特别关注 🎉
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {SUPPORT_CATEGORY_ORDER.filter((cat) => (supportByCategory[cat] ?? []).length > 0).map((cat) => (
                  <div key={cat}>
                    <p className="mb-1.5 text-xs font-medium text-slate-400">{SUPPORT_CATEGORY_LABELS[cat]}</p>
                    <div className="flex flex-col gap-2">
                      {supportByCategory[cat].map((item) => (
                        <SupportCard key={item.customerId} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
