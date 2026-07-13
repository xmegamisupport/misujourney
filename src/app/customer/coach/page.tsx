"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { WhatsAppContactButton } from "@/components/WhatsAppContactButton";
import { currentCoach } from "@/lib/mock-data";
import { useMyCoachContact } from "@/lib/coach-contact/hooks";

export default function CustomerCoachProfilePage() {
  const coach = currentCoach;
  const { data: coachContact, loading: coachContactLoading } = useMyCoachContact();

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="我的 Journey Coach" backHref="/customer" />

      <div className="flex flex-col items-center gap-2 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50 p-6 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-sm">
          {coach.avatar}
        </span>
        <p className="text-lg font-semibold text-slate-900">{coach.name}</p>
        <p className="text-sm text-slate-500">{coach.title}</p>
        <div className="mt-1 flex items-center gap-1 text-sm text-amber-500">
          {"★".repeat(Math.round(coach.rating))}
          <span className="ml-1 text-slate-400">{coach.rating}</span>
        </div>
      </div>

      <WhatsAppContactButton coachContact={coachContact} loading={coachContactLoading} />

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">关于我</p>
        <p className="text-sm leading-relaxed text-slate-500">{coach.bio}</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">擅长领域</p>
        <div className="flex flex-wrap gap-2">
          {coach.specialties.map((s) => (
            <span key={s} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">{coach.yearsExperience} 年</p>
          <p className="text-xs text-slate-400">陪伴经验</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">{coach.totalCustomers}</p>
          <p className="text-xs text-slate-400">陪伴顾客数</p>
        </div>
      </div>
    </div>
  );
}
