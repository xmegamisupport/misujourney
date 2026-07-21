# Living Garden — Artwork Integration Guideline

Version: 1.0

This document defines the **technical requirements** for every production-ready artwork.

It focuses on **how assets are built and integrated into the game**.

For visual style, color language, lighting mood, composition and artistic identity,
refer to:

**Living-Garden-Design-System.md**

This document exists to ensure that every generated asset can be dropped into the
project without additional rework.

---

# 1. Master Artwork Compatibility

Every asset must be compatible with the official Master Artwork.

Never redesign:

- camera
- layout
- perspective
- composition

Every asset exists to support the Master Artwork.

Never generate a new garden scene.

Never generate an alternative world.

---

# 2. One Subject Per File

Each file contains exactly ONE production asset.

Requirements:

- Transparent PNG
- No background
- No terrain
- No roads
- No scenery
- No frame
- No text
- No logo
- No watermark

Do not include unrelated decorative elements.

---

# 3. Bottom-Centre Anchor

The renderer positions every asset using:

Bottom Center

(transform-origin: bottom center)

Grounded assets:

- Sprout
- Grass
- Flower
- Tree
- Bench
- Fountain
- Rabbit
- Fence
- Bush
- Stones

must touch the bottom-centre of the canvas.

Floating assets:

- Butterfly
- Bee
- Bird

should keep transparent space around them while maintaining a consistent visual anchor.

---

# 4. Trim Transparent Padding

Transparent padding should be kept minimal.

Avoid:

- excessive empty margins
- uneven padding
- off-centre subjects

Incorrect padding causes incorrect placement inside the game.

---

# 5. Perspective

Every asset must match the Master Artwork perspective.

Never use:

- Top View
- Side View
- Isometric
- Different camera angle

Perspective consistency is mandatory.

---

# 6. Relative Scale

Each asset should represent its natural real-world size.

Example:

Tree
≫
Bush
≫
Flower
≫
Ladybug

The registry may fine-tune scaling slightly.

Large proportional corrections should never be required.

---

# 7. Lighting

Lighting must match the Design System.

Requirements:

- Upper-left light source
- Warm morning lighting
- Soft shadows
- Natural highlights

Lighting direction must remain identical across every asset.

---

# 8. Growth Consistency

Growth assets must represent the same object throughout every stage.

Example:

Seed

↓

Sprout

↓

Young Tree

↓

Growing Tree

↓

Final Tree

Do not redesign the object between stages.

Growth should feel continuous.

---

# 9. Mobile Readability

Assets are primarily viewed between approximately 80–150 px.

Prioritize:

- silhouette
- readability
- recognizable growth

Do not rely on tiny decorative details.

---

# 10. File Naming

Every filename must exactly match the asset registry.

Naming convention:

lowercase

hyphen-separated

no spaces

no version number

no prefixes

Example:

sprout.png

flower-pink.png

tree-small.png

butterfly.png

Version control is handled by Git.

---

# 11. File Location

Every asset must be placed at:

public/assets/living-garden/<category>/<filename>

The category must match the asset registry.

---

# 12. Deferred Assets

The following are not ordinary PNG assets and should not be produced during early production.

Examples:

- sunlight
- rainbow
- atmospheric lighting
- weather effects

These belong to later production stages.

---

# 13. QA Before Integration

Every asset must pass:

Asset-QA-Checklist.md

before integration.

Only approved assets should enter production.

---

# 14. Enable Artwork

Artwork becomes active only after:

1. QA approval

2. File placed in the correct folder

3. Registry updated

Example:

art: true

This flag switches the asset from placeholder to production artwork.

---

# 15. Production Principles

Every production asset must satisfy all of the following:

✓ Compatible with Master Artwork

✓ Transparent PNG

✓ Single subject

✓ Bottom-centre anchor

✓ Correct perspective

✓ Correct scale

✓ Consistent lighting

✓ Mobile readable

✓ Correct filename

✓ QA approved

Assets that do not satisfy every requirement should be rejected before integration.