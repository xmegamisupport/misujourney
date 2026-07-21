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
      {layer.items.map((item) => (
        <span
          key={item.id}
          className="absolute block select-none leading-none"
          style={{
            left: `${item.x}%`,
            bottom: `${item.y}%`,
            transform: `translate(-50%, 0) scale(${item.scale ?? 1})`,
            transformOrigin: "bottom center",
            fontSize: "clamp(20px, 6vw, 44px)",
          }}
        >
          {item.sprite}
        </span>
      ))}
    </div>
  );
}
