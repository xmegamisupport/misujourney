# C-Asset-Library

This folder is the official Living Garden Asset Library.

Every asset must permanently keep:

- `spec.md`
- `prompt.md`
- preview images (in `preview/`)
- final PNG (in `final/`)

## Naming Convention (permanent, official standard)

The final asset is always the **simplest subject name**:

```
sprout.png   daisy.png   lavender.png   rabbit.png   stone.png
tree.png     bench.png   pond.png       lantern.png  bird.png
butterfly.png  mushroom.png  bush.png   fountain.png
```

Rules:

- **lowercase**
- **singular**
- **descriptive but concise**
- **no numbers**
- **no version** — version history is Git's job, not the filename's
- **no color** unless the colour is the object's defining identity
- **no category / material prefix** (a wooden fence is `fence.png`, not
  `wooden_fence.png`)

**Variants** of the same object use a **descriptive suffix only** (never a
version number):

```
tree_oak.png       tree_pine.png
butterfly_blue.png butterfly_monarch.png
flower_pink.png    flower_white.png
```

**Folders:** `preview/` may hold dated candidates (e.g. `sprout-preview-v1.png`);
`final/` holds exactly one production `<name>.png` per asset (plus any named
variants). A revised asset keeps the same `final/<name>.png` — the history lives
in Git and in that asset's `prompt.md` → Revision History.

> This is the permanent naming convention for the whole Living Garden. All
> Project Pack documents (Asset Inventory, Day 1–35 Unlock Plan, Asset Prompt
> Library) use these official names; the earlier `*_01.png` working names have
> been fully retired.

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
