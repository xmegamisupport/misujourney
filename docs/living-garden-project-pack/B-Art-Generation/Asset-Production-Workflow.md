# Asset Production Workflow

Version: 2.0
Status: Production Ready

Aligned with Living Garden Design System v2.0 and the lessons from PL-001 Sprout production validation.

This document translates the principles defined in the Living Garden Design System into a repeatable, step-by-step production workflow. If any conflict arises, the Living Garden Design System remains the canonical reference and takes precedence over this workflow.

Every production asset must follow this workflow.

Skipping phases is not allowed.

Only assets that complete all phases may enter production.

## Production Pipeline

The single, repeatable path every Living Garden asset follows from concept to
live product. Follow it in order; an asset is not "done" until Phase 5 passes.

This document is the **spine** — it links the specialist docs rather than
repeating them:

- *How it should feel / look* → `Living-Garden-Design-System.md` (Visual DNA)
- *Technical build rules that prevent rework* → `Artwork-Integration-Guideline.md`
- *Pass/fail gate* → `Asset-QA-Checklist.md`
- *Base prompt* → `Master-Asset-Prompt.md`; *per-subject prompt* → each asset's `../C-Asset-Library/<Category>/<Asset>/prompt.md`
- *Where the asset's files live* → `../C-Asset-Library/README.md`

> **Calibration first.** The five approved calibration assets (see
> `../C-Asset-Library/Calibration-Assets.md`) must complete the whole pipeline and
> be approved *together* before any other asset is produced. They set the visual
> language everything else inherits. Do not batch-produce before calibration
> passes.

---

## Phase 1 — Concept Approved

Before a brush touches the canvas:

- [ ] Visual DNA re-read; the asset's intended **feeling** is clear.
- [ ] Hero/reference asset identified — which existing approved asset this one
      must sit beside without looking foreign.
- [ ] **Composition check:** where it sits (foreground / midground / background),
      its role (focal / support / filler), and its scale tier are decided.
- [ ] Official **filename** and **category** are known (they already exist in the
      registry — see Phase 4).
- [ ] Confirm the asset already exists inside the Master Artwork.

No asset should be invented outside the official Living Garden world.

Output of this phase: a subject prompt in the asset's `prompt.md`.


## Phase 2 — Illustration
The illustration should always begin by matching the final stage (the fully-grown appearance) found in the Master Artwork.

Earlier growth milestones are derived afterwards. The number of milestones is a per-asset choice — it is not a fixed count.

Never design the first stage first.

- **Working / master canvas:** 2048 × 2048 px, transparent, square. Paint the
  subject occupying ~70–85% of the frame, light from **upper-left**.
- **Anchor while painting:** compose so the subject's **ground-contact point** is
  centred horizontally and near the lower area — grounded subjects touch soil at
  bottom-centre; air creatures (butterfly, bird, bee) hover with their lowest
  visible point toward the bottom. (Overrides any "centered composition" note in
  older specs — a correction confirmed during PL-001 Sprout validation.)
- **PNG transparency:** true alpha, no background, no baked scene, no hard ground
  shadow (a soft implied contact shadow only). No white fringe/halo.
- **Trim + pad:** crop to the content bounding box, then add a uniform transparent
  margin of ~3% of the longer edge. The trimmed+padded canvas's **bottom-centre
  is the anchor** the renderer will use.
- **Export resolution:**
  - **Master** (kept forever in `final/` alongside `<name>.png`, or a `master/`
    sibling): full-res, ≥ 1024 px on the long edge, lossless PNG-24 + alpha.
  - **Production copy** (the live `<name>.png`): long edge ≈ 512 px, optimized
    PNG with alpha. That is ~3× headroom over the largest on-screen size, so it
    stays crisp on retina without bloating the bundle.

## Phase 3 — Asset QA

Run the full one-page gate in `Asset-QA-Checklist.md`. It verifies, at minimum:

- lighting direction (upper-left, warm morning)
- watercolor consistency (edges, texture, saturation — matches the world)
- silhouette readability at the intended mobile display size
- transparency (clean alpha, no fringe)
- padding (trimmed + uniform margin; anchor intact)
- **anchor point** (bottom-centre contact verified)
- **scale relationship** (correct next to its neighbours)
- **filename** (exactly the registry `fileName`)
- **category** (correct folder / registry category)
- **cohesion** — the asset looks like it belongs beside the approved calibration assets (the quality bar set by PL-001 Sprout)
- **benchmark** — if a Founder-approved version already exists, the candidate clearly exceeds it (see Benchmark Protection) or is rejected

An asset must be marked **APPROVED** here before Phase 4. No exceptions.

Assets failing QA return to Phase 2.

They do not proceed to integration.

## Phase 4 — Integration
Do not modify any app or engine logic during artwork integration.

Artwork replacement should never require behaviour or logic changes.

1. **File location:** place the approved production PNG at
   `public/assets/living-garden/<category>/<fileName>` (e.g.
   `public/assets/living-garden/plants/sprout.png`). Keep the master + `spec.md`
   + `prompt.md` in the asset's `C-Asset-Library/<Category>/<Asset>/` folder.
2. **Registry:** the asset already exists in
   `src/lib/living-garden/gardenAssets.ts` with its `id`, `category`, `layer`,
   `fileName`, `glyph`, and `baseScale`. Confirm `category` + `fileName` match the
   file you dropped. (`category` is our field for the founder's "assetType".)
3. **Enable in production:** flip that asset's **`art: true`**. That is the entire
   switch — the adapter now emits the image path instead of the emoji.
4. **Validate:** open the garden with `?preview=1` (Founder Preview) and scrub to
   the day the asset appears. Confirm it stands correctly (anchor), reads at size,
   and sits believably beside its neighbours.

## Phase 5 — Final Verification

Confirm the invariant that makes this whole system cheap:

> **Replacing an emoji with a production asset requires only a registry change** —
> drop the file, confirm `category`/`fileName`, set `art: true`. No engine, no
> adapter, no renderer, no Day-1–35 progression edits.

Then run `tsc` / lint / build, and confirm the founder-preview render. Done.

---

## Change log

- **v2 (Milestone 3.1):** rewrote the 5 loose stages into the 5-phase concept→live
  pipeline; added canvas size, export resolution, anchor verification, and the
  registry `art`-flag integration mechanics; replaced the hardcoded calibration
  list with a pointer to `Calibration-Assets.md` so it cannot drift.
- **v2.0 (post-PL-001 Sprout):** aligned with Design System v2.0 — mobile-first
  wording ("intended display size", no fixed pixel viewing targets) and milestone
  language instead of fixed stage numbers in Phase 2; reduced game-production
  terms in Phase 4. Folded in the PL-001 lessons: the bottom-centre anchor
  supersedes any "centered" note, Phase 3 now checks cohesion against the quality
  bar, and Benchmark Protection gates regeneration (a new version must
  demonstrably beat the approved one). Export/canvas resolutions are technical
  file specs and remain unchanged.

## Production Principles

Always remember:

The world is fixed.

The Master Artwork is permanent.

Production improves assets,
never the world.

If an asset requires redesigning the world,
the production process is incorrect.

Every asset should naturally integrate into
the existing Living Garden without changing
camera, layout, perspective or composition.

## Benchmark Protection

Once an asset reaches "Production Ready" status and is approved by the Founder,
it becomes the canonical benchmark for that asset.

Future generations are treated as candidates only.

A candidate may replace the production asset only if it is demonstrably superior
in visual quality, readability, consistency, and compliance with the Design System.

Otherwise, the approved production asset remains unchanged.
