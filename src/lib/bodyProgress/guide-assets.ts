import type { BodyProgressAngle } from "./types";

/**
 * Single source of truth for the Body Progress photo-guide example images.
 *
 * Components must read paths ONLY from here — never hardcode an image path —
 * so the guide photos can be swapped in future by simply overwriting the files
 * in /public/images/body-progress-guide/ (same filenames) without touching any
 * component or code.
 *
 * These are real example photos, not posture analysis. Their only purpose is
 * to show every customer a consistent angle so Day 1 / Day 30 / Day 60 can be
 * compared fairly.
 */
const GUIDE_DIR = "/images/body-progress-guide";

export interface GuideImage {
  src: string;
  label: string;
}

/** The overall "how to stand / framing" example shown at the top of the guide. */
export const BODY_PROGRESS_GUIDE_OVERVIEW: GuideImage = {
  src: `${GUIDE_DIR}/overview.jpeg`,
  label: "拍摄示范",
};

/** One example photo per capture angle, in the same order as the capture flow
 * (BODY_PROGRESS_ANGLES). */
export const BODY_PROGRESS_GUIDE_ANGLES: (GuideImage & { angle: BodyProgressAngle })[] = [
  { angle: "front", src: `${GUIDE_DIR}/front.jpeg`, label: "正面" },
  { angle: "left", src: `${GUIDE_DIR}/left.jpeg`, label: "左侧" },
  { angle: "right", src: `${GUIDE_DIR}/right.jpeg`, label: "右侧" },
  { angle: "back", src: `${GUIDE_DIR}/back.jpeg`, label: "背面" },
];

/** Angle → example photo, so the capture step can show the reference for the
 * angle currently being shot. Same single source of truth. */
export const BODY_PROGRESS_GUIDE_BY_ANGLE: Record<BodyProgressAngle, GuideImage> = Object.fromEntries(
  BODY_PROGRESS_GUIDE_ANGLES.map(({ angle, src, label }) => [angle, { src, label }]),
) as Record<BodyProgressAngle, GuideImage>;
