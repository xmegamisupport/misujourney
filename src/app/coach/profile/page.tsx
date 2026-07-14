"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountSettingsSection } from "@/components/AccountSettingsSection";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCoachProfile, useMyCustomers } from "@/lib/coach/hooks";
import { updateCoachWhatsAppContact } from "@/lib/coach/engine";
import type { MyCoachProfile } from "@/lib/coach/engine";
import { useCheckInsForCustomers } from "@/lib/inventory/hooks";
import { DEFAULT_COUNTRY_ISO, findCountryByIso } from "@/lib/countries";
import { normalizeInternationalPhoneNumber, getCoachWhatsAppUrl, buildCoachContactMessage } from "@/lib/whatsapp";
import type { WhatsAppContactMethod } from "@/lib/whatsapp";

const linkItems = [
  { href: "/coach/referral", label: "我的 Referral", icon: "🔗" },
  { href: "/coach/customers", label: "我的顾客", icon: "👥" },
  { href: "/coach/alerts", label: "跟进提醒", icon: "🔔" },
];

const staticItems = [
  { label: "通知设置", icon: "🔔" },
  { label: "帮助中心", icon: "❓" },
];

function daysAgoDateStr(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Mounted only once `coach` has loaded (see usage below), so its local
 * draft state can be lazily initialized straight from the real value
 * instead of syncing it in via a setState-in-effect. */
function WhatsAppContactEditor({ coach }: { coach: MyCoachProfile }) {
  const [countryIso, setCountryIso] = useState(coach.whatsappCountryIso ?? DEFAULT_COUNTRY_ISO);
  const [localNumber, setLocalNumber] = useState(coach.whatsappLocalNumber ?? "");
  const [useCustomLink, setUseCustomLink] = useState(coach.whatsappContactMethod === "custom_link");
  const [customLink, setCustomLink] = useState(coach.whatsappCustomLink ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const country = findCountryByIso(countryIso);
  const normalizedNumber = country ? normalizeInternationalPhoneNumber(country.dialCode, localNumber) : null;
  const contactMethod: WhatsAppContactMethod = useCustomLink ? "custom_link" : "generated_number";
  const previewUrl = getCoachWhatsAppUrl(
    { contactMethod, normalizedNumber, customLink },
    buildCoachContactMessage("顾客"),
  );

  async function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const result = await updateCoachWhatsAppContact({
      coachId: coach.id,
      countryCode: country?.dialCode ?? "",
      countryIso,
      localNumber,
      customLink,
      contactMethod,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "保存失败，请稍后再试");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleTest() {
    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <p className="mb-1 text-sm font-semibold text-slate-700">WhatsApp 联络资料</p>
        <p className="text-xs text-slate-400">顾客会用这个联络方式通过 WhatsApp 联系你</p>
      </div>

      {coach.whatsappNeedsReview && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
          系统检测到你有旧的联络号码资料，但无法确认所属国家，请重新选择国家并确认号码后保存。
        </div>
      )}

      {!useCustomLink && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            国家/地区
            <CountrySelector value={countryIso} onChange={setCountryIso} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            WhatsApp 手机号码
            <input
              type="tel"
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value.replace(/[^0-9\s\-()+]/g, ""))}
              placeholder="0123456789"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </label>
        </div>
      )}

      <button type="button" onClick={() => setUseCustomLink((v) => !v)} className="self-start text-xs font-medium text-sky-600">
        {useCustomLink ? "▾" : "▸"} 使用自定义 WhatsApp Link（进阶）
      </button>

      {useCustomLink && (
        <label className="flex flex-col gap-1.5 text-sm text-slate-600">
          自定义 WhatsApp Link
          <input
            type="text"
            value={customLink}
            onChange={(e) => setCustomLink(e.target.value)}
            placeholder="https://wa.me/60123456789"
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <span className="text-[11px] text-slate-400">只接受 wa.me / api.whatsapp.com / whatsapp.com 的 https 链接</span>
        </label>
      )}

      <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
        顾客将会联系：
        {useCustomLink
          ? customLink
            ? "你的自定义 WhatsApp Link"
            : "尚未填写"
          : country
            ? `${country.name} +${country.dialCode} ${localNumber || "（尚未填写号码）"}`
            : "请先选择国家/地区"}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          disabled={!previewUrl}
          onClick={handleTest}
          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          测试 WhatsApp 链接
        </button>
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}
      {saved && <p className="text-xs text-emerald-600">已保存 ✓</p>}
    </div>
  );
}

export default function CoachProfilePage() {
  const { user } = useAuthUser();
  const coachId = user?.id ?? "";
  const { data: coach } = useMyCoachProfile(coachId);
  const { data: customers } = useMyCustomers(coachId);
  const customerIds = useMemo(() => customers.map((c) => c.id), [customers]);
  const weekAgo = useMemo(() => daysAgoDateStr(6), []);
  const { data: checkInMap } = useCheckInsForCustomers(customerIds);
  const activeThisWeek = customerIds.filter((id) => (checkInMap[id] ?? []).some((ci) => ci.date >= weekAgo)).length;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="我的" />

      <div className="flex items-center gap-4 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
          {coach?.avatar ?? "🌿"}
        </span>
        <div>
          <p className="text-lg font-semibold text-slate-900">{coach?.name ?? ""}</p>
          <p className="text-sm text-slate-500">MISU Journey Coach</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">{customers.length}</p>
          <p className="text-xs text-slate-400">总顾客数</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">{activeThisWeek}</p>
          <p className="text-xs text-slate-400">本周活跃</p>
        </div>
      </div>

      {coach && <WhatsAppContactEditor key={coach.id} coach={coach} />}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {linkItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-sm text-slate-700 last:border-b-0 hover:bg-slate-50"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-slate-300">→</span>
          </Link>
        ))}
      </div>

      <AccountSettingsSection />

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <LanguageSwitcher />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {staticItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-sm text-slate-700 last:border-b-0"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-slate-300">→</span>
          </div>
        ))}
      </div>

      <SignOutButton className="rounded-xl border border-rose-100 bg-rose-50 py-3 text-center text-sm font-semibold text-rose-500 transition hover:bg-rose-100" />
    </div>
  );
}
