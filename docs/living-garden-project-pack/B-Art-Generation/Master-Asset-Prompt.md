# Living Garden — Master Asset Prompt

Version: 1.0

This document defines the universal prompt used to generate every production-ready Living Garden asset.

It is the foundation prompt for all AI image generation.

Do not modify this prompt.

Asset-specific instructions should only replace the SUBJECT section.

For artistic direction, refer to:

- Living-Garden-Design-System.md
- Artwork-Integration-Guideline.md

---

# MASTER PROMPT

```text
Create ONE production-ready asset for the MISU Living Garden.

The asset must belong to the official Living Garden world defined by the Master Artwork.

VISUAL STYLE

Create a premium illustrated storybook asset.

The illustration should combine:

• Storybook illustration
• Painterly digital rendering
• Soft watercolor texture
• Semi-realistic natural proportions
• Rounded organic forms
• Gentle silhouettes

The artwork should feel:

• Warm
• Peaceful
• Cozy
• Hopeful
• Natural
• Rich without being crowded

The asset must appear as though it was painted by the same illustrator who created the Master Artwork.

COLOR

Use a natural premium palette dominated by:

• Olive Green
• Moss Green
• Forest Green
• Warm Leaf Green
• Honey Yellow
• Warm Cream
• Natural Wood Brown

Accent colors may include:

• Dusty Pink
• Lavender
• Soft Orange
• Muted Blue
• Terracotta

Avoid:

• Neon
• Fluorescent
• Oversaturated colors
• Grey washed colors
• Low contrast
• Plastic appearance

LIGHTING

Use:

• Warm morning sunlight
• Upper-left light direction
• Soft natural shadow
• Golden highlights

Perspective

Match the official Master Artwork.

Never invent another camera angle.

TECHNICAL REQUIREMENTS

Generate:

• ONE isolated subject only

Requirements:

• Transparent PNG

• No background

• No terrain

• No road

• No scenery

• No additional objects

• No text

• No logo

• No watermark

• No decorative frame

• Bottom-center anchor

• Minimal transparent padding

• Production ready

• High resolution

• Mobile readable

SUBJECT

[Replace this section with the asset's subject prompt from its C-Asset-Library/<Category>/<Asset>/prompt.md]

NEGATIVE PROMPT

Do NOT generate:

• Entire garden scene

• Multiple assets

• Multiple growth stages

• Concept sheet

• Mood board

• Character lineup

• Top View

• Side View

• Isometric

• Dashboard UI

• Inventory icon

• Sticker

• Clip art

• Flat vector

• 3D render

• Anime

• Pixar style

• Photorealism

• Hyperrealism

• Plastic texture

• Hard black outline

• Perfect symmetry

• Modern furniture

• White background

• Colored background

• Watermark

OUTPUT

Generate exactly ONE production-ready PNG asset suitable for direct integration into the Living Garden project.
```

---

# Reference Image

Whenever the image-generation tool supports image references, always attach the approved Master Artwork.

The Master Artwork is the highest-priority visual reference.

The generated asset must visually match:

- Perspective
- Lighting
- Painting style
- Color language
- Shape language
- Overall artistic quality

The Master Artwork always takes precedence over text instructions.

---

# Usage

Every production prompt should be constructed as:

Master Asset Prompt

+

One asset description from:

the asset's own C-Asset-Library/<Category>/<Asset>/prompt.md

Example:

Master Prompt

+

Ancient Tree

or

Master Prompt

+

Rabbit

or

Master Prompt

+

Pink Flower

Never modify the Master Prompt itself.

Only replace the SUBJECT section.