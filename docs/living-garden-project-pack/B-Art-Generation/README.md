# Living Garden Art Generation

These files define the visual style and asset-generation process for Living Garden.

They are intended for image-generation tools and visual-production workflows.

They are **not** instructions to modify the application.

## Recommended usage

1. Read the Visual DNA in `Living-Garden-Design-System.md`.
2. Follow `Asset-Production-Workflow.md` — the concept→live pipeline (this is the
   spine; the steps below are its short form).
3. Use `Master-Asset-Prompt.md` as the fixed base prompt.
4. Select one subject prompt from `Asset-Prompt-Library.md`.
5. Generate only the five calibration assets first
   (`../C-Asset-Library/Calibration-Assets.md`).
6. Review them against `Asset-QA-Checklist.md` and the build rules in
   `Artwork-Guideline.md`.
7. Continue producing the remaining assets only after the visual style is approved.
8. Save approved assets using the official filenames (see
   `../C-Asset-Library/README.md`) and hand the PNGs to Claude Code for the
   integration phase.

## Important

Do not generate all assets before completing visual calibration.

> Whenever the chosen image-generation tool supports image references, attach
> the founder's official Living Garden visual reference image. That image is the
> single source of truth for the visual direction described in these files.
