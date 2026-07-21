# Living Garden — Asset Checklist (production-ready gate)

One page. Every asset must pass **all** items before it is marked production-ready
and integrated. Mark **Pass** or **Revise** per line. This is Phase 3 of the
`Asset-Production-Workflow.md` pipeline.

## Visual Consistency
- [ ] Matches the Visual DNA (`Living-Garden-Design-System.md`)
- [ ] Looks like the same illustrator / same storybook world
- [ ] Not clip art, not a game-inventory icon
- [ ] Not 3D or plastic

## Color & Saturation
- [ ] Medium-rich, dusty saturation — matches the pink-flower yardstick
- [ ] Not pale/washed-out, not neon/candy
- [ ] Uses the approved natural palette
- [ ] Enough contrast against garden greenery

## Lighting
- [ ] Single source, **upper-left**, warm golden morning
- [ ] Soft natural shadow; no harsh black shadow
- [ ] No cold/blue or dramatic/night lighting

## Watercolor & Shape
- [ ] Paint-defined soft edges (no uniform vector outline, no black keyline)
- [ ] Slightly irregular watercolor edges; visible-but-restrained texture
- [ ] Clear, readable silhouette at mobile size (~40–120px)
- [ ] Organic curves, natural asymmetry

## Transparency & Padding
- [ ] True PNG alpha; no background; no white background/fringe/halo
- [ ] No baked-in hard ground shadow (soft implied contact shadow only)
- [ ] Trimmed to content, then uniform ~3% transparent margin
- [ ] Full object visible (not cropped)

## Anchor Point  *(technical — prevents floating art)*
- [ ] Ground-contact point sits at the **bottom-centre** of the canvas
- [ ] Air creatures (butterfly/bird/bee): lowest visible point near bottom edge
- [ ] Verified in Founder Preview (`?preview=1`) — the asset "stands" correctly

## Scale Relationship
- [ ] Correct real-world size next to its neighbours (small-tree is the anchor;
      ladybug ≪ flower < grass < sprout < bush < small-tree ≪ big-tree)
- [ ] `baseScale` only nudges — the raw art is already close

## Technical / Integration
- [ ] No text, logo, or watermark
- [ ] **Filename** exactly matches the registry `fileName` (lowercase, hyphenated,
      `.png`)
- [ ] **Category** correct — file dropped in
      `public/assets/living-garden/<category>/`, matches registry `category`
- [ ] Master (≥1024px) preserved; production copy ~512px optimized
- [ ] After `art: true`: renders live with no engine/adapter/renderer change

## Final Decision
Use one of: **APPROVED** · **REVISE** · **REJECTED**

Do not integrate any asset that is not **APPROVED**.
