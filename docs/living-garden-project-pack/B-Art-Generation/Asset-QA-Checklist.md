# Living Garden — Asset QA Checklist

Version: 2.0  
Status: Production Ready

This document is the final quality gate before any Living Garden asset enters production.

Every asset must pass every check below.

Assets that fail any item must return to **Phase 2 – Illustration** in `Asset-Production-Workflow.md`.

No exceptions.

This checklist applies the Living Garden Design System (the canonical reference on any conflict) and the Production Workflow. QA is pass/fail against these criteria — not a pursuit of illustration perfection. Once an asset passes, it is production-ready and should not be endlessly refined.

---

# 1. Visual Consistency

## World

- [ ] Matches the official Master Artwork
- [ ] Matches the Living Garden Design System
- [ ] Belongs naturally to the same illustrated world
- [ ] Feels painted by the same illustrator
- [ ] Belongs beside the approved calibration assets (the quality bar)

---

## Style

- [ ] Storybook illustration style
- [ ] Painterly digital rendering
- [ ] Soft watercolor texture
- [ ] Semi-realistic proportions
- [ ] Rounded organic forms
- [ ] Soft readable silhouette

---

## Color

- [ ] Uses approved natural color palette
- [ ] Medium-rich saturation
- [ ] Not washed out
- [ ] Not oversaturated
- [ ] Not neon
- [ ] Sufficient contrast against garden background

---

## Lighting

- [ ] Upper-left light source
- [ ] Warm morning lighting
- [ ] Soft natural shadow
- [ ] Natural highlights
- [ ] No cold lighting
- [ ] No harsh black shadows

---

# 2. Mobile Readability & Emotional Clarity

- [ ] Reviewed at the intended mobile display size — not zoomed in
- [ ] Immediately recognizable at that size
- [ ] Strong, clear silhouette
- [ ] Emotional feeling reads at that size (emotion should scale; detail need not)
- [ ] Fine details are not required for recognition

---

# 3. Technical Requirements

## PNG

- [ ] Transparent PNG
- [ ] Single asset only
- [ ] No background
- [ ] No terrain
- [ ] No roads
- [ ] No scenery
- [ ] No additional unrelated objects
- [ ] No text
- [ ] No logo
- [ ] No watermark

---

## Transparency

- [ ] Clean alpha channel
- [ ] No white fringe
- [ ] No halo
- [ ] No hard baked ground shadow
- [ ] Soft contact shadow only when appropriate

---

## Canvas

- [ ] Full object visible
- [ ] Correct transparent padding
- [ ] Bottom-center anchor maintained

---

# 4. Perspective & Scale

## Perspective

- [ ] Matches Master Artwork perspective
- [ ] No Top View
- [ ] No Side View
- [ ] No Isometric View

---

## Scale

- [ ] Correct real-world proportions
- [ ] Fits naturally beside neighboring assets
- [ ] baseScale requires only minor adjustment

---

# 5. File Validation

- [ ] Filename exactly matches registry
- [ ] Correct category
- [ ] Correct folder location
- [ ] Master PNG preserved (≥1024 px)
- [ ] Production PNG exported (~512 px)

---

# 6. Integration Validation

- [ ] Registry entry verified
- [ ] art: true enabled
- [ ] Appears correctly in Founder Preview
- [ ] Correct unlock day
- [ ] Correct layer
- [ ] No overlap issues
- [ ] No unexpected scaling
- [ ] No behaviour or logic changes required
- [ ] Benchmark: if an approved version already exists, this candidate is objectively better — otherwise keep the approved asset

---

# 7. Common Failure Examples

Reject assets that show any of the following:

- [ ] Wrong perspective
- [ ] Wrong lighting direction
- [ ] Floating grounded asset
- [ ] Excessive transparent padding
- [ ] White outline
- [ ] Incorrect proportions
- [ ] Different painting style
- [ ] Looks like another game
- [ ] Contains unnecessary detail for the intended mobile display size.
- [ ] Multiple subjects
- [ ] Entire garden scene
- [ ] Background included

---

# 8. Final Decision

Choose one:

- ☐ APPROVED
- ☐ REVISE
- ☐ REJECTED

Approve only when every check above passes. If this asset replaces an existing approved benchmark, approve only when it is objectively better; otherwise keep the current production asset (Benchmark Protection).

---

Reviewer:

________________________

Date:

________________________

Asset:

________________________

Version:

________________________

Comments:

____________________________________________________

____________________________________________________

____________________________________________________