# C-Asset-Library

The official storage location for every Living Garden visual asset.

Each asset lives in its own folder under a category (`Plants/`, `Animals/`,
`Nature/`, …) and must contain all four of:

- **`spec.md`** — what the asset is, its palette, shape language, lighting, scale and export rules.
- **`prompt.md`** — the exact prompt used to generate it, plus a revision history.
- **`preview/`** — preview / candidate images generated during review.
- **`final/`** — the approved, exported PNG that production uses.

## Rules

- **Never overwrite previous versions.** Add a new file (e.g. `sprout_v2.png`)
  and record it in the asset's `prompt.md` revision history. Old versions stay.
- One asset per folder. Keep the folder name and the filenames consistent with
  the Asset Inventory in `../C-Product-Planning/Asset-Inventory.md`.
- Only files inside a `final/` folder that have been marked **APPROVED** in the
  QA checklist may be integrated into the application.

## Folder layout

```
C-Asset-Library/
├── README.md
├── Calibration-Assets.md
├── Plants/
│   ├── Sprout/    (spec.md, prompt.md, preview/, final/)
│   ├── Daisy/
│   └── Lavender/
├── Animals/
│   └── Rabbit/
└── Nature/
    └── Stone/
```

## Related folders

- Visual direction & prompts: `../B-Art-Generation/`
- Product plan & inventory: `../C-Product-Planning/`
