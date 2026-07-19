import type { MisuMessage } from "@/lib/misu-voice/engine";

/** ❤️ MISU 想告诉你 — the Dashboard's answer to "how should I understand today?"
 *
 * Prominence follows the emotional weight of the day, not a fixed slot:
 *   tier 0 — a quiet line, no card chrome (an ordinary day)
 *   tier 1 — a card, below Today's Journey
 *   tier 2 — a prominent card ABOVE Today's Journey (the caller places it)
 *
 * The heading only appears from tier 1 up: on an ordinary day MISU murmurs
 * rather than announces. */
export function MisuVoiceCard({ message }: { message: MisuMessage }) {
  if (message.tier === 0) {
    return <p className="px-1 text-center text-xs leading-relaxed text-slate-400">{message.text}</p>;
  }

  const prominent = message.tier === 2;

  return (
    <div
      className={
        prominent
          ? "rounded-2xl border border-rose-200 bg-rose-50/70 p-4"
          : "rounded-2xl border border-slate-200 bg-white p-4"
      }
    >
      <p className={prominent ? "text-xs font-semibold text-rose-500" : "text-xs font-medium text-slate-400"}>❤️ MISU 想告诉你</p>
      <p className={`mt-1.5 leading-relaxed text-slate-700 ${prominent ? "text-sm" : "text-xs"}`}>{message.text}</p>
    </div>
  );
}
