import { MISU_TRIGGERS, type MisuTier, type MisuTone, type MisuVoiceContext } from "./library";

export type { MisuTier, MisuTone, MisuVoiceContext } from "./library";

export interface MisuMessage {
  id: string;
  tier: MisuTier;
  tone: MisuTone;
  text: string;
}

/** Pick the one thing MISU says today.
 *
 * Exactly one message per day — never two. Ranked by the priority ladder in the
 * library (safety → anxiety → proactive → explanation → recognition → normal),
 * so the wound is always addressed before the applause.
 *
 * Variant choice is deterministic from the Journey day rather than random: the
 * message is stable if she reopens the app during the day, and it rotates as
 * the Journey advances. A message log (V1.1) will replace this with proper
 * "not seen in 14 days" rotation, and is also the substrate for the reflective
 * family ("三天前你担心的，今天已经恢复了") and for showing her how far her own
 * thinking has come.
 *
 * Pure and deterministic — no DB, no clock, no LLM — so the whole system can be
 * reasoned about and tested from a plain context object. */
export function selectMisuMessage(ctx: MisuVoiceContext): MisuMessage | null {
  const eligible = MISU_TRIGGERS.filter((t) => {
    try {
      return t.matches(ctx);
    } catch {
      return false;
    }
  });
  if (eligible.length === 0) return null;

  const winner = eligible.reduce((best, t) => (t.priority < best.priority ? t : best));
  if (winner.variants.length === 0) return null;

  const index = Math.abs(ctx.journeyDay + winner.id.length) % winner.variants.length;
  return { id: winner.id, tier: winner.tier, tone: winner.tone, text: winner.variants[index] };
}
