# Living Garden — Asset Placeholders

Placeholder art for the Living Garden asset system. Structure:

    assets/living-garden/
      ground/  plants/  nature/  animals/  objects/  effects/

Each file is registered in `src/lib/living-garden/gardenAssets.ts` by ID.

## Shipping real artwork

1. Replace the .svg here with your artwork at the SAME path (SVG or PNG).
2. If you use PNG, change the extension in `gardenAssets.ts` (the `src` builder).
3. Nothing else changes — IDs, layers, positions and day-unlocks stay put.

Today the framework renderer draws each asset's `glyph` (emoji). When it gains
an image renderer, it reads `src` (these files) instead. The content system
(registry, day-unlocks, positions, accumulation) is already complete.
