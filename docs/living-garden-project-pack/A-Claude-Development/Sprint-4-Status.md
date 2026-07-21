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

---

# Production Sprint 1 — Chapter 1 Playability

**Status: Completed**

Goal: make Chapter 1 (Living Garden) playable — no Chapter 2, no rebuild.

**Changed:**

- **Founder Preview gated to `?preview=1`.** The day scrubber is a founder/dev
  tool only; production customers now never see it. `GardenView` reads the URL
  flag (`usePreviewFlag`); when hidden, the garden simply renders at the
  customer's real Journey day (`initialDay`). This was the one blocker to
  shipping Chapter 1.
- **Generic Discovery Engine added** (`src/lib/living-garden/discovery.ts`):
  `GardenProgress` + `UnlockCondition` (a day threshold today) + `isUnlocked`.
  The engine now routes every stage through it — one uniform rule for trees,
  flowers, rabbits, ponds, etc., with no per-object logic. Future conditions
  (tasks, streaks, achievements) slot in as new union members with no renderer
  change. Public API unchanged: `buildGardenState(chapter, day)` still stands;
  garden output is byte-identical to Sprint 4 (verified headless).

**Not done (deliberately):** Chapter 2, artwork, engine rewrite, role/admin
gating (URL flag chosen instead), and no cleanup of the debt items below (each
awaits approval per the continuous-improvement rule).

## Technical Debt

| # | Item | Priority |
|---|---|---|
| 1 | Dead `garden-data.ts` (`PLACEHOLDER_CHAPTER`) | Low |
| 2 | Two master-prompt versions in one file | Low |
| 3 | Two decision-log homes | Medium |
| 4 | Asset naming: registry IDs vs official `<name>.png` | Medium (blocks art integration) |

1. **Dead code — `garden-data.ts`.** *Problem:* superseded by `assetChapter.ts`;
   still imported only as the default arg of `useGardenState`/`useGardenPreview`,
   never actually rendered. *Why it matters:* a reader can't tell which chapter
   is live; two "placeholder chapters" invite drift. *Solution:* drop the default
   arg, delete the file, make `chapter` a required param. *Effort:* ~20 min.
   *Priority:* Low.
2. **Duplicate master prompt.** *Problem:* `B-Art-Generation/Master-Asset-Prompt.md`
   holds both the original prompt and an appended "Master Prompt v2". *Why:* two
   sources of truth for the base prompt. *Solution:* keep one, archive the other
   under a clearly-labelled heading. *Effort:* ~10 min. *Priority:* Low.
3. **Two decision logs.** *Problem:* `docs/PRODUCT_DECISIONS.md` and
   `MISU Journey Handbook/decisions/PD-*.md` both record decisions. *Why:* future
   decisions may land in the wrong place and be lost. *Solution:* pick one home,
   leave a one-line pointer in the other. *Effort:* ~15 min. *Priority:* Medium.
4. **Asset naming mismatch.** *Problem:* the live registry uses working IDs +
   `.svg`; the Project Pack defines official `<name>.png`. *Why:* the art
   integration sprint can't cleanly map approved PNGs until one scheme is
   canonical in code. *Solution:* at art-integration time, rename registry IDs
   and `src` paths to the official names in one pass. *Effort:* ~30 min.
   *Priority:* Medium (do it with the first real art drop, not before).
