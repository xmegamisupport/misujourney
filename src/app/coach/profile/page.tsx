"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { AccountSettingsSection } from "@/components/AccountSettingsSection";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { WhatsAppContactEditor } from "@/components/WhatsAppContactEditor";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCoachProfile } from "@/lib/coach/hooks";

/** My Account is where the Coach manages themselves — not their work. No
 * coaching statistics, no customer management, no daily workflow (those live
 * on the Dashboard and in My Customers). Only account + personal settings. */
export default function CoachAccountPage() {
  const { user } = useAuthUser();
  const coachId = user?.id ?? "";
  const { data: coach } = useMyCoachProfile(coachId);

  return (
    <div className="flex flex-col gap-6 px-4 pb-8 md:px-8">
      <PageHeader title="我的账户" />

      {/* ---------- 教练信息 ---------- */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">教练信息</p>

        <div className="flex items-center gap-4 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50 p-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">{coach?.avatar ?? "🌿"}</span>
          <div>
            <p className="text-lg font-semibold text-slate-900">{coach?.name ?? ""}</p>
            <p className="text-sm text-slate-500">MISU Journey Coach</p>
          </div>
        </div>

        {/* WhatsApp Configuration — activates the Coach contact across the
            Journey system. Left unchanged intentionally. */}
        {coach && (
          <WhatsAppContactEditor
            key={coach.id}
            coachId={coach.id}
            initial={{
              countryIso: coach.whatsappCountryIso,
              localNumber: coach.whatsappLocalNumber,
              customLink: coach.whatsappCustomLink,
              contactMethod: coach.whatsappContactMethod,
              needsReview: coach.whatsappNeedsReview,
            }}
          />
        )}
      </section>

      {/* ---------- 账户设置 ---------- */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">账户设置</p>

        <AccountSettingsSection />

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <LanguageSwitcher />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3.5 text-sm text-slate-700">
            <span className="text-lg">🔔</span>
            <span className="flex-1">通知设置</span>
            <span className="text-slate-300">→</span>
          </div>
        </div>
      </section>

      {/* ---------- 支持 ---------- */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">支持</p>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3.5 text-sm text-slate-700">
            <span className="text-lg">❓</span>
            <span className="flex-1">帮助中心</span>
            <span className="text-slate-300">→</span>
          </div>
        </div>

        <SignOutButton className="rounded-xl border border-rose-100 bg-rose-50 py-3 text-center text-sm font-semibold text-rose-500 transition hover:bg-rose-100" />
      </section>
    </div>
  );
}
