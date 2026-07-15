"use client";

import { useState } from "react";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { CoachScript } from "@/lib/coach/workspace-types";

/** XMEGAMI Coaching Script for the situation — teaches an on-culture way to
 * communicate. The Coach may copy it, edit it, or ignore it entirely; the
 * system never forces any wording. No AI. The parent keys this component by
 * the rendered text so it remounts fresh when the customer/situation changes
 * — no state-sync effect needed. */
export function CoachingScriptSheet({ script, rendered, whatsappNumber }: { script: CoachScript; rendered: string; whatsappNumber: string | null }) {
  const [text, setText] = useState(rendered);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; the coach can still select the text manually.
    }
  }

  const waUrl = whatsappNumber ? buildWhatsAppLink(whatsappNumber, text) : null;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-700">XMEGAMI Coaching Script</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700">{script.intent}</span>
        <span className="text-[11px] text-slate-400">语气：{script.tone}</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-xl border border-slate-200 bg-white py-2 text-center text-sm font-medium text-slate-600 transition hover:border-emerald-300"
        >
          {copied ? "已复制 ✓" : "复制"}
        </button>
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-emerald-500 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            用 WhatsApp 发送
          </a>
        ) : (
          <span className="rounded-xl bg-slate-100 py-2 text-center text-sm font-medium text-slate-400">未设置手机号</span>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">可复制 · 可修改 · 也可以完全用你自己的话</p>
    </div>
  );
}
