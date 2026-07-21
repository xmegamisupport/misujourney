import type { GardenLayer, GardenState } from "@/lib/living-garden/types";

/** ── The renderer ───────────────────────────────────────────────────────────
 *
 * GardenScene draws a GardenState and NOTHING else. It has no idea what day it
 * is, what a Journey Point is, or that "growth" exists — it paints whatever
 * layers and items it is handed. That ignorance is the point: the identical
 * component renders every future chapter, season and event unchanged.
 *
 * Each layer is its own absolutely-positioned element, painted back-to-front —
 * deliberately NOT flattened into a single image, so any layer can later be
 * parallaxed, swapped, or animated on its own.
 */
export function GardenScene({ state }: { state: GardenState }) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: state.palette.skyBottom }}
      aria-label="你的花园"
      role="img"
    >
      {state.layers.map((layer) => (
        <LayerView key={layer.id} layer={layer} />
      ))}

      {/* Ambient light wash over the whole scene, from the palette. */}
      {state.palette.light !== "transparent" && (
        <div className="pointer-events-none absolute inset-0" style={{ background: state.palette.light }} />
      )}
    </div>
  );
}

/** How tall the ground band is, as a share of scene height. Item `y` is measured
 * from the bottom of the scene, so plants placed at small y sit on the soil. */
const GROUND_BAND = "26%";

/** Base on-screen size of a scale-1.0 sprite. Emoji use it as font-size; images
 * use it as height (width follows aspect). Per-item `scale` multiplies it. Kept
 * identical to the original emoji metric so current placeholder rendering is
 * unchanged; the artwork guideline tells the illustrator to design each subject
 * to this reference footprint, and it is re-calibrated with the first real PNGs. */
const SPRITE_SIZE = "clamp(20px, 6vw, 44px)";

/** A sprite string is an image when it points at a file (the registry emits a
 * `/assets/...` path once an asset's `art` is switched on); otherwise it is an
 * emoji glyph drawn as text. One cheap check keeps the renderer un-redesigned. */
const isImageSprite = (sprite: string) => sprite.startsWith("/");

function LayerView({ layer }: { layer: GardenLayer }) {
  // Full-bleed wash layers (sky, ground) render as a coloured band.
  const wash =
    layer.fill &&
    (layer.id === "ground" ? (
      <div className="absolute inset-x-0 bottom-0" style={{ height: GROUND_BAND, background: layer.fill }} />
    ) : (
      <div className="absolute inset-0" style={{ background: layer.fill }} />
    ));

  return (
    <div className="pointer-events-none absolute inset-0">
      {wash}
      {layer.items.map((item) => {
        // Shared placement: same origin/anchor for emoji and images, so an asset
        // swaps from glyph to PNG without moving. Bottom-center means a sprite
        // "stands" where it is placed — which is why artwork must put its
        // ground-contact point at the bottom-centre of the canvas.
        const place = {
          left: `${item.x}%`,
          bottom: `${item.y}%`,
          transform: `translate(-50%, 0) scale(${item.scale ?? 1})`,
          transformOrigin: "bottom center" as const,
        };
        return isImageSprite(item.sprite) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.sprite}
            alt=""
            draggable={false}
            className="absolute block select-none"
            style={{ ...place, height: SPRITE_SIZE, width: "auto" }}
          />
        ) : (
          <span
            key={item.id}
            className="absolute block select-none leading-none"
            style={{ ...place, fontSize: SPRITE_SIZE }}
          >
            {item.sprite}
          </span>
        );
      })}
    </div>
  );
}
