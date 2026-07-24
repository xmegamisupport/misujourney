/**
 * Registry parsing — the Registry JSON is the single source of truth. This turns
 * raw entries into normalized DiscoveryDefs and classifies which the engine can
 * evaluate today. The `custom` rules that already have first-class evaluators are
 * mapped here (weight_loss_reached → weight_delta, return_after_gap → comeback);
 * unmapped `custom` rules stay `custom` and are reported unsupported.
 */
import type { DiscoveryDef, TriggerType } from "./types.mts";

interface RawTrigger {
  type: string;
  params?: Record<string, unknown>;
}
interface RawDiscovery {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  rarity: string;
  celebrationType: string;
  trigger: RawTrigger;
  enabled: boolean;
  version: string;
}
export interface RawRegistry {
  $meta?: { version?: string };
  discoveries: RawDiscovery[];
}

/** Map a raw Registry trigger to the engine's canonical (triggerType, condition). */
export function normalizeTrigger(t: RawTrigger): { triggerType: TriggerType; condition: Record<string, unknown> } {
  const p = (t.params ?? {}) as Record<string, unknown>;
  if (t.type === "custom") {
    const rule = p.rule;
    const params = (p.params ?? {}) as Record<string, unknown>;
    if (rule === "weight_loss_reached") return { triggerType: "weight_delta", condition: { kg: params.kg } };
    if (rule === "return_after_gap") {
      return { triggerType: "comeback", condition: { minGapDays: params.minGapDays, returnDays: 3 } };
    }
    return { triggerType: "custom", condition: { rule, params } };
  }
  return { triggerType: t.type as TriggerType, condition: p };
}

export function parseRegistry(raw: RawRegistry): DiscoveryDef[] {
  return (raw.discoveries ?? []).map((d) => {
    const { triggerType, condition } = normalizeTrigger(d.trigger);
    return {
      id: d.id,
      name: d.name,
      icon: d.icon,
      description: d.description,
      category: d.category,
      rarity: d.rarity,
      celebrationType: d.celebrationType,
      triggerType,
      condition,
      unlockScope: "lifetime",
      enabled: d.enabled,
      registryVersion: d.version,
    } satisfies DiscoveryDef;
  });
}

/** Sources for which the snapshot carries per-record local times. */
const TIMED_SOURCES = new Set(["weighin"]);

/**
 * Static supportability — can the engine evaluate this discovery's trigger with
 * the data the system actually has? Independent of `enabled`. Used for the docs
 * table and the engine result's `unsupported` bucket.
 */
export function supportAudit(defs: DiscoveryDef[]): { id: string; supported: boolean; reason?: string }[] {
  return defs.map((d) => {
    const c = d.condition;
    if (d.triggerType === "custom") {
      return { id: d.id, supported: false, reason: `custom rule "${String(c.rule ?? "?")}" not implemented in engine` };
    }
    if (d.triggerType === "calendar_condition" && (typeof c.before === "string" || typeof c.after === "string")) {
      const source = typeof c.source === "string" ? c.source : "";
      if (!TIMED_SOURCES.has(source)) {
        return { id: d.id, supported: false, reason: `no time-of-day timestamp for source "${source}"` };
      }
    }
    return { id: d.id, supported: true };
  });
}
