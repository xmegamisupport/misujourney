# C-Asset-Library

This folder is the official Living Garden Asset Library.

Every asset must permanently keep:

- `spec.md`
- `prompt.md`
- preview images (in `preview/`)
- final PNG (in `final/`)

## Naming Convention (authoritative — effective immediately)

The final asset is always a plain, lowercase name — the subject and nothing else:

```
sprout.png   daisy.png   lavender.png   rabbit.png   stone.png
```

- **No version numbers or qualifiers in the filename.** Not `LG_Sprout_v1.png`,
  not `sprout_01.png`, not `sprout_v7_final_final2.png`.
- **Version control is Git's job, not the filename's.** A revised asset keeps
  the same `final/<name>.png`; the history lives in Git and in that asset's
  `prompt.md` → Revision History.
- **Variants use a descriptive suffix**, not a version number — e.g.
  `sprout_winter.png`, `sprout_gold.png`, `sprout_stage2.png`. Each variant is
  its own final file, still with no version number.
- **`preview/`** may hold dated candidates (e.g. `sprout-preview-v1.png`);
  **`final/`** holds exactly one production file per asset/variant.

> The planning docs (`../C-Product-Planning/Asset-Inventory.md`,
> `Day-1-to-35-Unlock-Plan.md`, `../B-Art-Generation/Asset-Prompt-Library.md`)
> still list earlier working names such as `sprout_01.png`. Those are legacy
> working labels; each asset adopts its plain `<name>.png` final under this
> convention as its folder is produced.

## Rules

- **Never overwrite previous versions.** History lives in Git; do not encode it
  in the filename.
- One asset per folder. `final/` contains exactly one production PNG (plus any
  named variants).
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
