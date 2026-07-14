"use client";

import { useState } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { getCoachWhatsAppUrl, buildCoachContactMessage } from "@/lib/whatsapp";
import type { CoachContact } from "@/lib/coach-contact/types";

interface WhatsAppContactButtonProps {
  coachContact: CoachContact | null;
  loading: boolean;
}

/** Single 【WhatsApp联系Coach】 action — no message/call options. Shared by
 * the full coach profile page and the dashboard's Coach bottom sheet so the
 * link-building and no-coach/no-number states only live in one place. */
export function WhatsAppContactButton({ coachContact, loading }: WhatsAppContactButtonProps) {
  const { user } = useAuthUser();
  const { data: journey } = useJourneySummary(user?.id ?? "");
  const [opening, setOpening] = useState(false);

  const url = coachContact
    ? getCoachWhatsAppUrl(
        {
          contactMethod: coachContact.whatsappContactMethod,
          normalizedNumber: coachContact.whatsappNormalizedNumber,
          customLink: coachContact.whatsappCustomLink,
        },
        buildCoachContactMessage(journey?.name || "顾客"),
      )
    : null;

  function handleContactClick() {
    if (!url || opening) return;
    setOpening(true);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => setOpening(false), 1500);
  }

  if (loading) {
    return (
      <button type="button" disabled className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-400">
        加载中...
      </button>
    );
  }

  if (!coachContact) {
    return (
      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-sm text-slate-500">
        目前还没有绑定 Coach，请联系管理员协助。
      </div>
    );
  }

  if (!url) {
    return (
      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-sm text-slate-500">
        Coach 的 WhatsApp 资料暂未设置，请联系管理员。
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={opening}
      onClick={handleContactClick}
      className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
    >
      💬 WhatsApp 联系 Coach
    </button>
  );
}
