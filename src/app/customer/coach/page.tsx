"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { currentCoach } from "@/lib/mock-data";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useMyCoachContact } from "@/lib/coach-contact/hooks";
import { normalizeWhatsAppNumber, buildWhatsAppLink, buildCoachContactMessage } from "@/lib/whatsapp";

export default function CustomerCoachProfilePage() {
  const coach = currentCoach;
  const { user } = useAuthUser();
  const { data: journey } = useJourneySummary(user?.id ?? "");
  const { data: coachContact, loading: coachContactLoading } = useMyCoachContact();
  const [opening, setOpening] = useState(false);

  const whatsappNumber = coachContact?.whatsappNumber ? normalizeWhatsAppNumber(coachContact.whatsappNumber) : null;

  function handleContactClick() {
    if (!whatsappNumber || opening) return;
    setOpening(true);
    const message = buildCoachContactMessage(journey?.name || "顾客");
    window.open(buildWhatsAppLink(whatsappNumber, message), "_blank", "noopener,noreferrer");
    setTimeout(() => setOpening(false), 1500);
  }

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

      {coachContactLoading ? (
        <button
          type="button"
          disabled
          className="rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-400"
        >
          加载中...
        </button>
      ) : !coachContact ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-sm text-slate-500">
          目前还没有绑定 Coach，请联系管理员协助。
        </div>
      ) : !whatsappNumber ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-sm text-slate-500">
          Coach 的 WhatsApp 资料暂未设置，请联系管理员。
        </div>
      ) : (
        <button
          type="button"
          disabled={opening}
          onClick={handleContactClick}
          className="rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
        >
          💬 WhatsApp 联系 Coach
        </button>
      )}

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
