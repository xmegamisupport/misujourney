"use client";

import { useState } from "react";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { updateCoachWhatsAppContact } from "@/lib/coach/engine";
import { DEFAULT_COUNTRY_ISO, findCountryByIso } from "@/lib/countries";
import { normalizeInternationalPhoneNumber, getCoachWhatsAppUrl, buildCoachContactMessage } from "@/lib/whatsapp";
import type { WhatsAppContactMethod } from "@/lib/whatsapp";

export interface WhatsAppContactEditorInitial {
  countryIso: string | null;
  localNumber: string | null;
  customLink: string | null;
  contactMethod: WhatsAppContactMethod;
  needsReview: boolean;
}

interface WhatsAppContactEditorProps {
  coachId: string;
  initial: WhatsAppContactEditorInitial;
  onSaved?: () => void;
}

/** Shared by the Coach's own Profile page (editing their own row) and the
 * Admin Coach Management page (editing any Coach's row) — same RPC
 * (update_coach_whatsapp_contact) permits both, so the form only needs a
 * target coachId. Caller should mount this only once initial data has
 * loaded (e.g. behind `{coach && <.../>}`) so the draft state can be lazily
 * initialized straight from the real value instead of syncing it in via a
 * setState-in-effect. */
export function WhatsAppContactEditor({ coachId, initial, onSaved }: WhatsAppContactEditorProps) {
  const [countryIso, setCountryIso] = useState(initial.countryIso ?? DEFAULT_COUNTRY_ISO);
  const [localNumber, setLocalNumber] = useState(initial.localNumber ?? "");
  const [useCustomLink, setUseCustomLink] = useState(initial.contactMethod === "custom_link");
  const [customLink, setCustomLink] = useState(initial.customLink ?? "");
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
      coachId,
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
    onSaved?.();
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
        <p className="text-xs text-slate-400">顾客会用这个联络方式通过 WhatsApp 联系这位 Coach</p>
      </div>

      {initial.needsReview && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
          系统检测到有旧的联络号码资料，但无法确认所属国家，请重新选择国家并确认号码后保存。
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
            ? "自定义 WhatsApp Link"
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
