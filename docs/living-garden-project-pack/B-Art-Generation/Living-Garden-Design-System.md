MISU Journey — Living Garden Design System



Version: 2.0

Status: LOCKED

Priority: Highest (Single Source of Truth)

v2.0 — refinement of v1.0 (not a rewrite): the philosophy is sharpened toward behaviour design, mobile-first readability, reusable assets, and sustainable production. Structure and locked world rules are unchanged.



1\. Project Philosophy



Living Garden is not a traditional mobile game, and not a game to be played or completed.

At its heart it is behaviour design: a living world that reflects consistent healthy habits, so continuing the wellness journey feels rewarding rather than demanded.



It is a wellness companion that visualizes healthy habits through a living world.



People should never feel they are completing tasks.



Instead, they should feel they are gently caring for a garden that grows together with them.

Progress should be felt, not counted. The garden is designed so people experience a natural sense of growth without consciously tracking progression. The reward is emotional, not mechanical: no one should feel they are advancing a progress bar — they should simply notice the world quietly becoming more alive.



Everything inside the garden should reinforce five emotions:



Growth

Calm

Warmth

Nature

Hope



The objective is not entertainment.



The objective is emotional attachment and long-term engagement.

This is behaviour design, not a game loop. The world should stay fresh across a long journey and remain sustainable to produce, so it can keep growing alongside the person.



2\. Emotional Journey



The visual experience should evolve alongside the user's wellness journey.



Stage	Emotion

Day 1	Hope

Day 7	Progress

Day 14	Attachment

Day 21	Pride

Day 35	Living Garden



Every visual improvement must strengthen this emotional progression.



3\. MASTER ARTWORK (LOCKED)

Status



LOCKED



The Master Artwork is the only official Living Garden world.



It defines:



Camera

Layout

Perspective

Composition

Scale

Asset placement

Visual balance



Nothing may redesign this world.



Nothing may replace this artwork.



Everything else exists only to support it.



Insert the approved Master Artwork image here.



4\. World Rules



The following are permanently locked.



Camera

Mobile portrait (9:16)

Fixed camera

Fixed viewing angle

Fixed perspective



Never rotate.



Never zoom.



Never change camera position.



Layout



Never change:



Roads

Pond location

Fountain location

Ancient Tree location

Cottage location

Rabbit Meadow

Flower Garden

Fence

Overall composition



No redesign is allowed.



Background



There is only one permanent background.



background.png



This background is permanent.



Never regenerate it.



Never repaint it.



Never redesign it.



5\. Asset Categories



Living Garden contains two completely different asset types.



Permanent Assets



These never change.



Sky

Mountains

Terrain

Roads

Fence

Permanent Ground



These belong to Layer 0.



Growth Assets



These evolve over time.



Examples:



Ancient Tree

Cottage

Fountain

Bridge

Bird House

Mailbox

Bench

Flower Garden

Rabbit

Birds

Decorative Plants

FX



Only these assets are allowed to change.



The world itself never changes.



6\. Visual DNA

Overall Feeling



Living Garden should feel like a warm illustrated storybook.



The world should be:



Warm

Peaceful

Inviting

Rich

Full of life

Premium

Cozy

Natural



Avoid:



Dashboard feeling

Inventory UI

Flat mobile game maps

Neon colors

Hyper-cartoon

Photorealism

Random clip-art

Illustration Style



Use a combination of:



Storybook illustration

Painterly digital rendering

Soft watercolor texture

Semi-realistic proportions

Rounded organic forms

Soft silhouettes



Every asset must feel painted by the same illustrator.



Color System



Primary:



Olive Green

Moss Green

Forest Green

Warm Leaf Green

Warm Earth Brown

Honey Yellow

Warm Cream



Accent:



Dusty Pink

Lavender

Soft Orange

Muted Blue

Terracotta



Avoid:



Neon

Fluorescent

Oversaturation

Grey washed colors

Lighting



Always use:



Warm morning sunlight

Upper-left light direction

Soft natural shadows

Warm highlights



Never use:



Night lighting

Cold blue lighting

Harsh black shadows

Shape Language



Use:



Rounded forms

Organic curves

Slight asymmetry

Natural foliage

Handmade feeling



Avoid:



Perfect symmetry

Sharp geometry

Artificial repetition

Detail Density



Alternate between:



Rich detail

Medium detail

Calm breathing spaces



Never overload the screen.



\## Mobile-First Asset Philosophy

This section is the single home for the mobile-readability philosophy. The later sections (Mobile First Principle, Asset Complexity Guidelines) cover only how to apply it and should not restate it.



Living Garden is a mobile experience, not a printed illustration book.



Every asset must be designed for the size people actually see on a phone.



When artistic detail conflicts with readability, always prioritize readability.



The goal is not to create the most detailed illustration.

The goal is to create the most emotionally recognizable asset.



An asset should remain beautiful and immediately recognizable at its intended mobile display size.



Prioritize:



\- Clear silhouette

\- Warm emotional feeling

\- Simple readable shapes

\- Consistent watercolor language



Avoid adding fine detail that disappears at mobile size.



Every production asset should pass both:



1\. Full-size review (master resolution)

2\. Mobile-size review (at normal mobile viewing size)



If an asset looks better after zooming in than it does at its intended display size, it is over-designed.





7\. World Architecture



The world is built with independent layers.



Layer 0

Terrain Background



Layer 1

Trees



Layer 2

Buildings



Layer 3

Decorations



Layer 4

FX



Layer 5

Creatures



Never merge multiple layers together.



8\. Asset Production Rules



Every production asset must satisfy the following:



Transparent PNG

Single asset only

No background

No terrain

No roads

No grass

No flowers

No rocks

No baked lighting

No surrounding scenery



Each PNG should contain only the asset itself.



9\. Perspective Rules



Every asset must match the Master Artwork.



Never invent another camera angle.



Never use:



Top View

Side View

Isometric



Only use the fixed Living Garden perspective.



10\. Anchor Rules



Every growth milestone must share exactly the same anchor point, regardless of how many milestones an asset has.



Example:



First milestone

↓



…as many milestones as the asset needs…

↓



Final milestone



The asset grows.



It never jumps.



It never shifts position.



11\. Mobile First Principle



This section covers implementation only; the philosophy lives in Mobile-First Asset Philosophy. Assets are viewed primarily on phones, at their intended mobile display size.



Typical display context:



the intended mobile display size.



Therefore priority is:



Silhouette

Readability

Shape

Growth recognition



Fine details are secondary.



If a detail disappears at normal mobile viewing size, it should not drive the design.



12\. Growth Rules



Growth must feel natural.



Never simply scale an object larger.

Growth represents emotional milestones, not a fixed number of stages. How many steps an asset takes is a creative choice per asset; the stage count is never hardcoded. What matters is that each visible change feels like a meaningful moment of progress. The stages below are illustrative, not a required count.



Example:



Seed



↓



Sprout



↓



Seedling



↓



Young Tree



↓



Growing Tree



↓



Final Tree



Every stage must clearly feel like the same living organism, growing continuously — it never jumps, and it never restarts.



13\. Asset Production Pipeline



Every asset follows exactly the same workflow.



Master Artwork



↓



Extract Final Asset



↓



Lock Position



↓



Lock Size



↓



Lock Perspective



↓



Create the final stage



↓



Reverse Engineer

(The stages below are illustrative — an asset uses as many stages as its growth needs.)



↓



Earlier stage



↓



…as many earlier stages as the asset needs…



↓



First stage



Never start from the first stage.



Always begin with the final completed asset.



14\. AI Generation Rules



Every generated asset must satisfy:



✓ Transparent PNG



✓ Single Asset



✓ No Scene



✓ No Garden



✓ No Background



✓ No Ground



✓ No Roads



✓ Same Perspective



✓ Same Anchor



✓ Same Lighting



✓ Mobile Readability



Any generated image containing an entire garden scene is considered incorrect.



15\. Development Principle



Never ask:



Can we redesign the world?



Always ask:



How does this asset grow inside the existing world?



The world is permanent.



Only life inside the world changes.



16\. Success Criteria



The project succeeds when a person reaches Day 35 and believes:



This is the same garden.

This is the same tree.

I grew this world myself.



The person should never feel:



The layout changed.

The world was regenerated.

Assets were randomly replaced.

A completely different scene appeared.



Growth must feel continuous.

Beyond that continuity, Living Garden succeeds only when these hold together:

Emotional progression — the world feels like it is growing with the person.

Mobile readability — every asset reads clearly at the size people actually see.

Sustainable production — the asset set stays small and affordable to extend.

Reusable assets — variation comes mostly from recomposing existing pieces.

Consistent visual identity — everything looks painted by the same hand.

Artwork quality alone is not sufficient. A beautiful asset that is unreadable on mobile, costly to sustain, or inconsistent with the world does not count as success.



17\. Asset Strategy

Living Garden is built from a small, reusable asset library — not an ever-growing pile of one-off art.

Keep the asset set small and high-reuse.

Favour recomposition: new moments come from arranging and combining existing assets, not from constantly creating new ones.

Keep production cost low so the world stays sustainable to extend.

Let strong emotional progression, not asset volume, carry the experience.

A small library used well creates more emotional impact than a large library used once.

18\. Asset Complexity Guidelines

Only create detail that survives at normal mobile viewing size.

Before adding complexity, ask whether it will still be visible — and still matter — at the intended mobile display size. If it will not, it is decoration for a screenshot, not for the person using the app.

Prioritize, in order: silhouette, readability, warmth, emotional clarity.

Avoid unnecessary illustration complexity. Detail that only reads when zoomed in is over-design (see Mobile-First Asset Philosophy).

19\. Production Scope

Living Garden intentionally keeps a compact production scope. Assets fall into three roles:

Core Assets define the emotional progression — the hero growth objects.

Supporting Assets provide variation around the core.

Decoration Assets are intended for reuse and recomposition across the world.

The objective is maximum emotional impact with sustainable production: a compact, reusable set that can carry a long journey without an ever-expanding art backlog.

20\. Golden Rule



The Master Artwork is sacred.



It is the only valid Living Garden world.



Everything else exists to support it.



No AI, designer, or developer is allowed to redesign, regenerate, or replace it.



The only acceptable work is to create layered assets that naturally grow inside this world.



Emotion should scale.

Detail does not have to.

