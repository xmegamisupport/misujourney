# Sprout — Hero Asset 001

**Category:** Plants (`plants`) · **File Name:** `sprout.png` · **Unlock:** Day 1

Sprout is the single most important asset in the Living Garden. Every future
asset inherits its visual quality — it is the quality bar. Full art direction:
Visual DNA (`../../B-Art-Generation/Living-Garden-Design-System.md`), build rules
(`../../B-Art-Generation/Artwork-Integration-Guideline.md`).

**Intent:** a single newborn seedling, just broken through soil, quietly reaching
toward the morning light — the bravest small thing in the garden.

## Final Production Specification

- **Silhouette:** two rounded cotyledon leaves in a soft open V on one slender
  upright stem from soil; reads as "new life" at thumbnail size. Exactly two main
  leaves — never a bush, never a flower.
- **Proportions:** small; leaves ~60% of height, stem ~40%. Leaves gently
  oversized vs a thin stem (stem width ≈ 1/6 of a leaf). Endearing, not chibi.
- **Leaf shape:** rounded teardrop/spade with a soft tip; a central vein *hinted*
  by lighter pigment, not drawn; each leaf subtly cupped (a real 3-D curl).
- **Stem shape:** one slender, gently curved stem leaning a few degrees toward the
  upper-left light; thicker at base, tapering, translucent tip. Never ruler-straight.
- **Asymmetry (required):** one leaf larger and higher (reaching light), the other
  smaller/lower; stem leans; nothing mirrors. Natural, not damaged.
- **Watercolor behaviour:** 2–3 translucent washes; soft internal gradients; a
  gentle bloom where pigment pools at the leaf bases and where stem meets soil.
- **Pigment variation:** fresh leaf-green body → warm yellow-green sunlit highlight
  (upper-left, tips) → cooler olive/moss at base and overlaps → whisper of ochre at
  soil. Never one flat green.
- **Transparency:** leaf tips painted semi-translucent (morning light through young
  foliage) on a fully transparent PNG — no background, box, or grey bleed.
- **Edge softness:** paint-defined, softly irregular, faint watercolor feather. No
  outline, no vector edge, no bold ink keyline.
- **Contact shadow:** small soft low-opacity (~15–25%) warm grey-violet ellipse
  under the base, diffused toward lower-right. Implied, not hard; not a ground plane.
- **Lighting:** single source, upper-left, warm golden morning; soft shadow
  lower-right; no harsh contrast, no rim light.
- **Emotional feeling:** hope, courage, tenderness, newborn reach — gentle
  protectiveness. Quiet, not performing cuteness.
- **Premium indicators:** layered translucent washes, translucent tips, subtle
  granulation, genuine asymmetry, hand-painted irregular edges, considered soft
  contact shadow, restrained dusty palette — a person painted it slowly.

**Alive vs generic:** alive = caught in a *moment and a direction* (asymmetric,
leaning, reaching a real light source, with translucency and pigment shifts).
Generic = symmetrical, flat one-green fill, straight centered stem, hard uniform
border — any app's "growth" icon.

## Anchor & Export

- **Base at bottom-centre** of the canvas (this overrides any older "centered"
  note). Grows upward with open space above.
- Transparent PNG; trim to content + ~3% uniform padding; master ≥1024px,
  production `sprout.png` ~512px on the long edge.
- Integration: `public/assets/living-garden/plants/sprout.png`, then set
  `SPROUT.art = true` in `src/lib/living-garden/gardenAssets.ts`.

## Sprout-specific QA (in addition to `Asset-QA-Checklist.md`)

- [ ] Exactly two cotyledon leaves (no bush / extra sprout / flower)
- [ ] Genuine asymmetry — one leaf higher/larger; stem leans
- [ ] Translucent sunlit leaf tips visible
- [ ] Multi-tone green (yellow-green highlight → olive base), not one flat green
- [ ] Light reads upper-left; soft shadow lower-right
- [ ] Soft diffuse contact shadow — grounded, not floating, not hard
- [ ] Soft irregular paint edges — no outline, no white sticker halo
- [ ] Base at bottom-centre; stands correctly in Founder Preview (`?preview=1`)
- [ ] Passes the "a person painted this slowly" test

## Common mistakes that instantly cheapen it

1. **Cheap:** flat single-colour fill, no wash layering.
2. **Cartoon:** bold black outline, chibi proportions, glossy highlight dot.
3. **Mobile game:** plastic/3-D bevel, hard drop shadow, neon/lime green, icon-centered.
4. **Sticker:** hard die-cut edge with white halo, crisp uniform border.
5. **AI-generated:** perfect symmetry, extra leaves/second sprout, muddy blending,
   inconsistent light, faint background box or grey bleed.
