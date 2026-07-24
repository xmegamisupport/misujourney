/**
 * Discovery System — the "there's still more waiting for me" layer of Glowing
 * You. Everything the UI needs comes from two RPCs; the browser never sees
 * unsolved trigger conditions or hidden hint text beyond the current stage.
 */

/** A still-hidden clue: a category, rarity and the current-stage hint only. */
export interface DiscoveryClue {
  category: string;
  rarity: string;
  stage: number;
  hint: string | null;
}

/** A discovery the user has unlocked and had revealed. */
export interface DiscoveredItem {
  code: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  rarity: string;
  unlocked_at: string;
}

/** The freshly-revealed discovery to celebrate (from evaluate_discoveries). */
export interface RevealedDiscovery {
  code: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  rarity: string;
}

export interface DiscoveryState {
  clues: DiscoveryClue[];
  discovered: DiscoveredItem[];
}
