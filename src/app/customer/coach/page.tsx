"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { WhatsAppContactButton } from "@/components/WhatsAppContactButton";
import { Avatar } from "@/components/ui/Avatar";
import { currentCoach } from "@/lib/mock-data";
import { useMyCoachContact } from "@/lib/coach-contact/hooks";

export default function CustomerCoachProfilePage() {
  const coach = currentCoach;
  const { data: coachContact, loading: coachContactLoading } = useMyCoachContact();

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="我的 Journey Coach" backHref="/customer" />

      <div className="flex flex-col items-center gap-2 rounded-card border border-brand-soft/40 bg-gradient-to-br from-brand-tint to-[#f1f4f7] p-6 text-center shadow-elev1">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-elev1">
          <Avatar value={coach.avatar} fallback="🌿" />
        </span>
        <p className="text-lg font-semibold text-ink">{coach.name}</p>
        <p className="text-sm text-ink-soft">{coach.title}</p>
        <div className="mt-1 flex items-center gap-1 text-sm text-amber-500">
          {"★".repeat(Math.round(coach.rating))}
          <span className="ml-1 text-ink-faint">{coach.rating}</span>
        </div>
      </div>

      <WhatsAppContactButton coachContact={coachContact} loading={coachContactLoading} />

      <div className="rounded-lg border border-line bg-surface p-4 shadow-elev1">
        <p className="mb-2 text-sm font-semibold text-ink">关于我</p>
        <p className="text-sm leading-relaxed text-slate-500">{coach.bio}</p>
      </div>

      <div className="rounded-lg border border-line bg-surface p-4 shadow-elev1">
        <p className="mb-2 text-sm font-semibold text-ink">擅长领域</p>
        <div className="flex flex-wrap gap-2">
          {coach.specialties.map((s) => (
            <span key={s} className="rounded-full bg-brand-tint px-3 py-1 text-xs font-medium text-brand-deep">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-surface p-4 text-center shadow-elev1">
          <p className="text-lg font-semibold text-ink">{coach.yearsExperience} 年</p>
          <p className="text-xs text-ink-faint">陪伴经验</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 text-center shadow-elev1">
          <p className="text-lg font-semibold text-ink">{coach.totalCustomers}</p>
          <p className="text-xs text-ink-faint">陪伴顾客数</p>
        </div>
      </div>
    </div>
  );
}
