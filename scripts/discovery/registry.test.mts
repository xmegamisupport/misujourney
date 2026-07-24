// Registry parsing + support audit against the REAL registry. Run: npm run test:discovery
import { test } from "node:test";
import assert from "node:assert/strict";
import registry from "../../config/hidden-discovery-registry.json" with { type: "json" };
import { normalizeTrigger, parseRegistry, supportAudit, type RawRegistry } from "../../src/lib/discovery/engine/registry.mts";

test("normalizeTrigger maps custom rules to first-class trigger types", () => {
  assert.deepEqual(normalizeTrigger({ type: "custom", params: { rule: "weight_loss_reached", params: { kg: 5 } } }), {
    triggerType: "weight_delta",
    condition: { kg: 5 },
  });
  assert.deepEqual(normalizeTrigger({ type: "custom", params: { rule: "return_after_gap", params: { minGapDays: 7 } } }), {
    triggerType: "comeback",
    condition: { minGapDays: 7, returnDays: 3 },
  });
  assert.equal(normalizeTrigger({ type: "custom", params: { rule: "start_new_journey" } }).triggerType, "custom");
  assert.deepEqual(normalizeTrigger({ type: "first_time", params: { source: "water" } }), {
    triggerType: "first_time",
    condition: { source: "water" },
  });
});

test("parseRegistry reads the real registry: 23 discoveries, unique ids", () => {
  const defs = parseRegistry(registry as unknown as RawRegistry);
  assert.equal(defs.length, 23);
  assert.equal(new Set(defs.map((d) => d.id)).size, 23);
  assert.equal(defs.filter((d) => d.enabled).length, 5); // 5 live at v1.2.0
});

test("support audit: engine can evaluate the effort-based triggers, flags the rest", () => {
  const defs = parseRegistry(registry as unknown as RawRegistry);
  const audit = new Map(supportAudit(defs).map((a) => [a.id, a]));
  // weight-loss milestones are supported by the new weight_delta evaluator
  assert.equal(audit.get("breakthrough-5kg")!.supported, true);
  assert.equal(audit.get("watertight")!.supported, true);
  assert.equal(audit.get("hundred-mornings")!.supported, true);
  // genuinely unsupported: no water-completion timestamp, and unmapped custom rules
  assert.equal(audit.get("early-finish")!.supported, false);
  assert.equal(audit.get("next-chapter-two")!.supported, false);
  assert.equal(audit.get("set-off-again")!.supported, false);
});
