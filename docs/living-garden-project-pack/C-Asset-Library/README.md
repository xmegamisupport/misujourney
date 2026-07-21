# C-Asset-Library

This folder is the official Living Garden Asset Library.

Every asset must permanently keep:

- `spec.md`
- `prompt.md`
- preview images (in `preview/`)
- final PNG (in `final/`)

## Rules

- **Never overwrite previous versions.**
- **Always keep version history.** When an asset is revised, add a new file
  (e.g. `sprout_v2.png`) and record it in that asset's `prompt.md` → Revision
  History. Old files stay.
- One asset per folder. Keep folder names and filenames consistent with
  `../C-Product-Planning/Asset-Inventory.md`.
- Only a file in a `final/` folder that has been marked APPROVED may be
  integrated into the application.

## Layout

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
