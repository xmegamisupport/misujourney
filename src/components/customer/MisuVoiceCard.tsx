import type { MisuMessage } from "@/lib/misu-voice/engine";

/** ❤️ MISU 想告诉你 — the Dashboard's answer to "what does today's weight mean?"
 *
 * Lives INSIDE the weight section, directly beneath the progress bar, so the
 * explanation sits next to the number it explains. The customer's reading flow
 * is: see today's weight → understand today's weight → continue today's Journey.
 * At the bottom of the page it was only read by people who scrolled.
 *
 * Prominence follows the emotional weight of the day, not a fixed slot:
 *   tier 0 — a plain line, no chrome. An ordinary day; MISU murmurs.
 *   tier 1–2 — a tinted inset block with the ❤️ heading, drawing the eye only
 *     when something actually needs explaining (weight up, 生理期, plateau,
 *     聚餐, a return after several days).
 *
 * The goal is never to be louder. It is to be noticeable exactly on the days
 * she needs guidance most — which means staying quiet on the days she doesn't.
 *
 * `standalone` = rendered on its own (no weight card that day), so it supplies
 * its own spacing instead of hugging the bar above it. */
export function MisuVoiceCard({ message, standalone = false }: { message: MisuMessage; standalone?: boolean }) {
  if (message.tier === 0) {
    return <p className={`text-xs leading-relaxed text-slate-500 ${standalone ? "px-1" : "mt-2"}`}>{message.text}</p>;
  }

  return (
    <div className={`rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2.5 ${standalone ? "" : "mt-3"}`}>
      <p className="text-[11px] font-semibold text-rose-500">❤️ MISU 想告诉你</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-700">{message.text}</p>
    </div>
  );
}
