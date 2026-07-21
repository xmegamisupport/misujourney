import {
  GARDEN_LAYERS,
  type GardenChapter,
  type GardenElement,
  type GardenItem,
  type GardenLayer,
  type GardenPalette,
  type GardenPaletteKeyframe,
  type GardenState,
} from "./types";
import { isUnlocked, type GardenProgress } from "./discovery";

/** ── The engine — pure, deterministic, content-agnostic ─────────────────────
 *
 * Turns (a chapter, a day) into a GardenState. No React, no I/O, no clock, no
 * randomness: the same inputs always produce the same scene, which is exactly
 * what the founder's preview scrubber needs and what makes the whole thing
 * testable without a browser. It knows about "day" only as a number to compare
 * stages against — it has no idea what a Journey is.
 */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate a "#rrggbb" pair. Anything that is not a plain hex colour (a
 * gradient string, say) is not interpolated — the nearer keyframe wins — so
 * authors can still use gradients without the engine mangling them. */
function mixHex(a: string, b: string, t: number): string {
  const hex = /^#([0-9a-f]{6})$/i;
  const ma = a.match(hex);
  const mb = b.match(hex);
  if (!ma || !mb) return t < 0.5 ? a : b;
  const ca = parseInt(ma[1], 16);
  const cb = parseInt(mb[1], 16);
  const r = Math.round(lerp((ca >> 16) & 255, (cb >> 16) & 255, t));
  const g = Math.round(lerp((ca >> 8) & 255, (cb >> 8) & 255, t));
  const bl = Math.round(lerp(ca & 255, cb & 255, t));
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

function mixPalette(a: GardenPalette, b: GardenPalette, t: number): GardenPalette {
  return {
    skyTop: mixHex(a.skyTop, b.skyTop, t),
    skyBottom: mixHex(a.skyBottom, b.skyBottom, t),
    ground: mixHex(a.ground, b.ground, t),
    light: t < 0.5 ? a.light : b.light,
  };
}

/** The palette for a day, interpolated between the surrounding keyframes. */
export function paletteForDay(keyframes: GardenPaletteKeyframe[], day: number): GardenPalette {
  if (keyframes.length === 0) {
    return { skyTop: "#bfe6ff", skyBottom: "#eaf7ff", ground: "#cde6b4", light: "transparent" };
  }
  const sorted = [...keyframes].sort((k1, k2) => k1.day - k2.day);
  if (day <= sorted[0].day) return sorted[0].palette;
  const last = sorted[sorted.length - 1];
  if (day >= last.day) return last.palette;

  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (day >= lo.day && day <= hi.day) {
      const t = clamp01((day - lo.day) / (hi.day - lo.day));
      return mixPalette(lo.palette, hi.palette, t);
    }
  }
  return last.palette;
}

/** The sprite an element shows for the given progress, or null if it has not
 * been unlocked yet. Each stage's unlock is evaluated by the generic discovery
 * engine (a day threshold today); the latest satisfied stage wins. */
function itemForProgress(el: GardenElement, progress: GardenProgress): GardenItem | null {
  let chosen: GardenElement["stages"][number] | null = null;
  for (const stage of el.stages) {
    if (isUnlocked({ type: "day", day: stage.day }, progress) && (!chosen || stage.day >= chosen.day)) chosen = stage;
  }
  if (!chosen) return null;
  return { id: el.id, sprite: chosen.sprite, x: el.x, y: el.y, scale: chosen.scale, depth: el.depth };
}

/** Assemble the full GardenState for one day of a chapter. `day` is wrapped into
 * a GardenProgress so every stage goes through the discovery engine; the public
 * signature stays `(chapter, day)` until a non-day condition actually needs to
 * flow in. */
export function buildGardenState(chapter: GardenChapter, day: number): GardenState {
  const progress: GardenProgress = { day };
  const palette = paletteForDay(chapter.palette, day);

  const byLayer = new Map<GardenLayer["id"], GardenItem[]>();
  for (const layerId of GARDEN_LAYERS) byLayer.set(layerId, []);

  for (const el of chapter.elements) {
    const item = itemForProgress(el, progress);
    if (item) byLayer.get(el.layer)!.push(item);
  }

  const layers: GardenLayer[] = GARDEN_LAYERS.map((id) => {
    const items = (byLayer.get(id) ?? []).sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
    // Sky and ground are washes fed from the palette; the renderer stays dumb.
    const fill =
      id === "sky"
        ? `linear-gradient(to bottom, ${palette.skyTop}, ${palette.skyBottom})`
        : id === "ground"
          ? palette.ground
          : undefined;
    return { id, fill, items };
  });

  return { palette, layers };
}
