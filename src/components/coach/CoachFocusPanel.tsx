"use client";

import { useMemo } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useMyCoachProfile } from "@/lib/coach/hooks";
import { useCoachCustomerContext } from "@/lib/coach/workspace-hooks";
import { deriveSupport, deriveCelebrations } from "@/lib/coach/workspace";
import { buildJourneyTimeline } from "@/lib/coach/timeline";
import { journeyNameFor, CELEBRATION_PRIORITY_ORDER, SUPPORT_PRIORITY_LABELS, SUPPORT_PRIORITY_STYLES } from "@/lib/coach/workspace-config";
import { scriptForSupport, scriptForCelebration, renderScript, COACH_SCRIPTS } from "@/lib/coach/scripts";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { calculateCurrentDay } from "@/lib/journey";
import { JourneyTimeline } from "./JourneyTimeline";
import { CoachingScriptSheet } from "./CoachingScriptSheet";
import { cn } from "@/lib/utils";

/** The Coach MVP Focus View, injected at the top of the customer detail page.
 * The Home answers "who should I talk to today?"; this answers "why" — the
 * full celebration + support reasoning, XMEGAMI Coaching Script, WhatsApp
 * hand-off and Journey Timeline. Read-only. The existing deeper sections
 * (trend summary, AI insight, inventory, meals) remain below. */
export function CoachFocusPanel({ customerId }: { customerId: string }) {
  const { user } = useAuthUser();
  const { data: coach } = useMyCoachProfile(user?.id ?? "");
  const { data: ctx, loading } = useCoachCustomerContext(customerId);

  const derived = useMemo(() => {
    if (!ctx) return null;
    const support = deriveSupport(ctx);
    const celebrations = deriveCelebrations(ctx).sort((a, b) => CELEBRATION_PRIORITY_ORDER[a.priority] - CELEBRATION_PRIORITY_ORDER[b.priority]);
    const celebration = celebrations[0] ?? null;
    const timeline = buildJourneyTimeline(ctx);
    const journeyDay = ctx.startDate ? calculateCurrentDay(ctx.startDate) : 1;
    const cappedDay = ctx.journeyDays ? Math.min(journeyDay, ctx.journeyDays) : journeyDay;
    const journeyName = journeyNameFor(ctx.journeyDays);

    const weights = [...ctx.checkIns].sort((a, b) => a.date.localeCompare(b.date)).map((c) => c.weight);
    const currentWeight = weights.length > 0 ? weights[weights.length - 1] : null;
    const lowestWeight = weights.length > 0 ? Math.min(...weights) : null;
    const weightDirection = weights.length >= 2 ? (weights[weights.length - 1] < weights[0] ? "下降" : weights[weights.length - 1] > weights[0] ? "上升" : "稳定") : "—";
    const remaining = ctx.inventory.reduce((sum, r) => sum + r.remainingUnits, 0);

    const script = support ? scriptForSupport(support.primaryType) : celebration ? scriptForCelebration(celebration.type) : COACH_SCRIPTS.low_consistency;
    const challenge = support?.reasons[0]?.text ?? celebration?.reasonNarrative ?? "";
    const rendered = renderScript(script.script, {
      CustomerName: ctx.name,
      CoachName: coach?.name ?? "Coach",
      JourneyName: journeyName.name,
      JourneyDay: String(cappedDay),
      CurrentWeight: currentWeight !== null ? String(currentWeight) : "",
      LowestWeight: lowestWeight !== null ? String(lowestWeight) : "",
      RemainingProducts: `${remaining} 包`,
      SupportReason: support?.reasons[0]?.text ?? "",
      CurrentChallenge: challenge,
    });

    return { support, celebration, celebrations, timeline, journeyName, cappedDay, currentWeight, weightDirection, script, rendered };
  }, [ctx, coach?.name]);

  if (loading || !ctx || !derived) return null;

  const whatsappNumber = ctx.phone ? normalizeWhatsAppNumber(ctx.phone) : null;

  const noSignals = derived.celebrations.length === 0 && !derived.support;

  return (
    <div className="flex flex-col gap-4">
      {/* 🎉 Celebrate Today — every celebration reason, never mixed with support. */}
      {derived.celebrations.length > 0 && (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">🎉 今天值得庆祝</p>
          <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-slate-700">
            {derived.celebrations.map((c) => (
              <li key={c.type}>· {c.reasonNarrative}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ❤️ Support Today — every support reason, its own section. */}
      {derived.support && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">❤️ 今天需要支持</p>
          <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-slate-700">
            {derived.support.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", SUPPORT_PRIORITY_STYLES[r.priority])}>
                  {SUPPORT_PRIORITY_LABELS[r.priority]}
                </span>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {noSignals && (
        <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
          目前状态良好，可以给 TA 一些鼓励。
        </section>
      )}

      {/* Journey Timeline */}
      <JourneyTimeline events={derived.timeline} />

      {/* Journey Context */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">
          {derived.journeyName.emoji} {derived.journeyName.name} · Day {derived.cappedDay}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm text-slate-600">
          <p>当前体重：{derived.currentWeight !== null ? `${derived.currentWeight}kg` : "—"}</p>
          <p>体重趋势：{derived.weightDirection}</p>
        </div>
      </section>

      {/* Coaching Script */}
      <CoachingScriptSheet key={derived.rendered} script={derived.script} rendered={derived.rendered} whatsappNumber={whatsappNumber} />
    </div>
  );
}
