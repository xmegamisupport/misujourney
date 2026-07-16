"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCoachProfile } from "@/lib/coach/hooks";
import { useCoachWorkspace } from "@/lib/coach/workspace-hooks";
import { CoachGreeting } from "@/components/coach/CoachGreeting";
import { MyImpact } from "@/components/coach/MyImpact";
import { CustomerWorkspaceCard } from "@/components/coach/CustomerWorkspaceCard";

export default function CoachWorkspacePage() {
  const { user } = useAuthUser();
  const coachId = user?.id ?? "";
  const { data: coach } = useMyCoachProfile(coachId);
  const { data: workspace, loading } = useCoachWorkspace(coachId);

  const noCards = !loading && workspace.cards.length === 0;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="教练工作台" subtitle="Every Day Is A New Journey" />

      {/* Today's Overview — greeting + a quick read on the day. */}
      <section>
        <h2 className="mb-2 text-lg font-bold text-slate-900">今日概况</h2>
        <CoachGreeting
          coachName={coach?.name ?? ""}
          celebrateCount={workspace.celebrateCustomerCount}
          supportCount={workspace.supportCustomerCount}
        />
      </section>

      {/* My Impact — encouraging coaching statistics */}
      <MyImpact impact={workspace.impact} />

      {/* Customer Workspace — one customer = one card. Answers "who should I
          talk to today?"; the Focus View answers "why". */}
      <section>
        <p className="mb-2 text-sm font-semibold text-slate-700">今日重点顾客</p>
        {noCards ? (
          <EmptyState icon="💚" title="全部照顾到了" description="今天你已经陪伴了每一位需要你的顾客。" />
        ) : (
          <div className="flex flex-col gap-2">
            {workspace.cards.map((card) => (
              <CustomerWorkspaceCard key={card.customerId} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
