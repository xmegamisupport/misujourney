# Living Garden Sprint 4 Status

**Status: Completed**

Sprint 4 established or prepared the Living Garden asset architecture, including:

- centralized asset registration
- Day 1–35 unlock data structure
- cumulative rendering
- layered garden rendering
- configurable asset placement
- compatibility with Founder Preview
- placeholder-to-formal-PNG replacement workflow

## Important

This status file is documentation only.

Do not assume every filename or implementation detail without checking the actual repository.

Before any future Living Garden development sprint:

1. Inspect the current implementation.
2. Preserve existing working behavior.
3. Avoid redesigning the UI unless explicitly requested.
4. Avoid adding unrelated features.
5. Report changed files and testing results.

Do not recreate Sprint 4 unless specifically instructed.

## Where things actually live (as of Sprint 4)

For convenience only — verify against the repository before relying on it:

- Asset registry: `src/lib/living-garden/gardenAssets.ts`
- Day unlock data: `src/lib/living-garden/dayUnlocks.ts`
- Asset → framework adapter: `src/lib/living-garden/assetChapter.ts`
- Placeholder art: `public/assets/living-garden/**`
- Rendering framework (do not modify): `src/lib/living-garden/engine.ts`,
  `src/components/living-garden/GardenScene.tsx`, and the surrounding
  components/hooks.

> Note: the current placeholder registry uses shorter working IDs and `.svg`
> placeholders. The formal art filenames follow the official naming convention
> in `../C-Asset-Library/README.md` — the simplest subject name, e.g. `daisy.png`
> (no numbers, no version, no category prefix). The future art integration sprint
> maps those approved `<name>.png` files onto the registry. The two naming layers
> are expected to differ until that integration happens.
