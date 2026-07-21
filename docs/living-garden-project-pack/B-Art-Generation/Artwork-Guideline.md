# Living Garden — Artwork Integration Guideline

Short, on purpose. This covers ONLY the technical rules that, if missed, force
artwork to be re-drawn. **Style, colour, lighting mood and composition live in
`Living-Garden-Design-System.md`** — follow that for *how it looks*. This page is
*how it must be built to drop into the app without rework.*

## 1. One subject, transparent PNG

- One subject per file. Transparent background. No baked-in scene, no frame.
- No hard ground shadow painted into the file (scenes composite many assets); a
  soft contact shadow directly under the subject is fine.
- No text, logo, or watermark.

## 2. Anchor: bottom-centre is where it "stands"

The renderer places every sprite by its **bottom-centre** (`transform-origin:
bottom center`). So:

- **Grounded subjects** (sprout, grass, flower, tree, bush, stone, bench, fence,
  fountain, rabbit): the point that touches the soil must sit at the **bottom-
  centre of the canvas**. Do not float a tree in the middle of the frame.
- **Floating subjects** (butterfly, bee, bird): draw them where they hover; their
  lowest visible point should reach near the canvas bottom edge, fully
  transparent all around.

## 3. Trim padding

Keep only a few pixels of transparent margin. Excess or uneven padding pushes the
real subject off the bottom-centre anchor, so it will look mis-placed or float.

## 4. Consistent relative scale

Design each subject to a consistent reference footprint and to its **real-world
relative size** — a tree is much larger than a flower, a flower larger than a
ladybug. The registry fine-tunes with a per-asset `baseScale`, but it only nudges;
it cannot rescue a flower drawn as big as a tree.

## 5. Filename must match the registry exactly

The file must be named exactly as the asset's `fileName` in
`src/lib/living-garden/gardenAssets.ts`: **simplest subject name, lowercase,
hyphen for compound names, `.png`.** No numbers, no version, no category prefix
(version control is Git's job). Drop it at
`public/assets/living-garden/<category>/<fileName>`.

First five validation assets:

| Subject | Filename | Category folder |
|---|---|---|
| Sprout | `sprout.png` | `plants` |
| Grass tuft | `grass.png` | `plants` |
| Pink flower | `flower-pink.png` | `plants` |
| Small tree | `tree-small.png` | `plants` |
| Butterfly | `butterfly.png` | `animals` |

## 6. Lighting must be consistent across every asset

Single light source, **upper-left**, warm morning (per the Design System). One
asset lit from a different direction will look pasted-in next to the others.

## 7. Do NOT produce yet

`sunlight` and `rainbow` are atmospheric effects, not sticker subjects, and are
deferred from the first batches. Producing them as ordinary PNGs will look wrong
and be wasted work.

## 8. Switching art on

Art is not "live" just by existing on disk. After QA-approval (see
`Asset-QA-Checklist.md`) and dropping the file at its path, set that asset's
`art: true` in the registry. That one boolean is the whole emoji → PNG switch.
