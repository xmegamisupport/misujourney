// Body-framing standard + real-time alignment math for the guided camera.
// Pure and deterministic (no DOM/ML) so it can be reasoned about and unit
// tested; the camera component feeds it pose landmarks each frame.
//
// Framing standard (normalised frame coords, y downward, 0 = top), taken from
// the four official reference photos:
//   • head crown ~7% from the top (5-8% headroom)
//   • frame ends at upper thigh (~90%)
//   • body centred on the vertical mid-line
//   • the body occupies ~80-85% of the frame height
// Capturing head→upper-thigh (not the whole body) keeps the face, arms, waist,
// abdomen, hips and upper thighs large and comparable across Day 1/30/60/90.

import type { BodyProgressAngle } from "./types";

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// BlazePose (MediaPipe) 33-landmark indices used here.
const LM = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
} as const;

export const FRAMING = {
  headTopY: 0.07,
  midThighY: 0.9,
  centerX: 0.5,
  get targetBodyHeight() {
    return this.midThighY - this.headTopY; // ~0.83 → body fills ~83% of the frame
  },
  // Tolerances (fractions of the frame). Deliberately generous — the goal is
  // "close enough for a consistent comparison", not pixel perfection.
  dxTol: 0.06,
  sizeTol: 0.12,
  crownBand: 0.09,
  thighBand: 0.1,
  shoulderLevelTol: 0.06,
  minVisibility: 0.5,
} as const;

/** Whether a given angle is a side profile. Front/back are symmetric (both
 * shoulders + both hips face the camera); left/right are profiles where the
 * far-side shoulder/hip is occluded and the shoulders can't be "level". */
export function isProfileAngle(angle: BodyProgressAngle): boolean {
  return angle === "left" || angle === "right";
}

export type AlignmentDir = "left" | "right" | "closer" | "backwards" | "none";

export interface AlignmentResult {
  hasBody: boolean;
  aligned: boolean;
  /** Customer-facing guidance for the current frame. */
  message: string;
  dir: AlignmentDir;
}

export interface AlignmentOptions {
  /** Flip only the left/right guidance to match a selfie-mirrored preview. */
  mirrored?: boolean;
  /** Side-profile framing: relaxes centring and skips the shoulder-level check. */
  profile?: boolean;
}

function vis(l: PoseLandmark | undefined): boolean {
  return !!l && (l.visibility === undefined || l.visibility >= FRAMING.minVisibility);
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Evaluate one frame of pose landmarks against the framing standard.
 * Front/back use the full symmetric check; side profiles relax centring and
 * drop the shoulder-level requirement (the far shoulder is occluded). */
export function computeAlignment(landmarks: PoseLandmark[] | null | undefined, opts: AlignmentOptions = {}): AlignmentResult {
  const { mirrored = true, profile = false } = opts;

  // Core body must be present. Front/back need both shoulders + both hips;
  // a profile only needs the nose plus at least one shoulder and one hip.
  const shouldersSeen = [LM.leftShoulder, LM.rightShoulder].filter((i) => landmarks && vis(landmarks[i]));
  const hipsSeen = [LM.leftHip, LM.rightHip].filter((i) => landmarks && vis(landmarks[i]));
  const noseSeen = !!landmarks && vis(landmarks[LM.nose]);
  const haveCore = profile
    ? noseSeen && shouldersSeen.length >= 1 && hipsSeen.length >= 1
    : noseSeen && shouldersSeen.length === 2 && hipsSeen.length === 2;

  const thighPairs: number[] = [];
  if (landmarks && vis(landmarks[LM.leftHip]) && vis(landmarks[LM.leftKnee])) thighPairs.push((landmarks[LM.leftHip].y + landmarks[LM.leftKnee].y) / 2);
  if (landmarks && vis(landmarks[LM.rightHip]) && vis(landmarks[LM.rightKnee])) thighPairs.push((landmarks[LM.rightHip].y + landmarks[LM.rightKnee].y) / 2);
  const hasThigh = thighPairs.length >= 1;

  if (!landmarks || !haveCore || !hasThigh) {
    return { hasBody: false, aligned: false, message: "请站进画面里，让身体进入镜头", dir: "none" };
  }

  const headPoints = [LM.nose, LM.leftEye, LM.rightEye, LM.leftEar, LM.rightEar]
    .map((i) => landmarks[i])
    .filter(vis)
    .map((l) => l.y);
  const crownY = Math.max(0, Math.min(...headPoints) - 0.04); // crown sits above eyes/ears

  const centerXs = [...shouldersSeen, ...hipsSeen].map((i) => landmarks[i].x);
  const centerX = avg(centerXs);

  const midThighY = avg(thighPairs);

  const bodyHeight = midThighY - crownY;
  const sizeRatio = bodyHeight / FRAMING.targetBodyHeight;
  const dx = centerX - FRAMING.centerX;

  const dxTol = profile ? FRAMING.dxTol + 0.03 : FRAMING.dxTol; // a profile naturally sits a touch off-centre
  const sized = Math.abs(sizeRatio - 1) <= FRAMING.sizeTol;
  const centered = Math.abs(dx) <= dxTol;
  const crownOk = Math.abs(crownY - FRAMING.headTopY) <= FRAMING.crownBand;
  const thighOk = Math.abs(midThighY - FRAMING.midThighY) <= FRAMING.thighBand;

  // Shoulder-level check only applies to a front/back stance with both
  // shoulders in view; a profile can't be "level".
  const level = profile || shouldersSeen.length < 2 || Math.abs(landmarks[LM.leftShoulder].y - landmarks[LM.rightShoulder].y) <= FRAMING.shoulderLevelTol;

  const aligned = sized && centered && crownOk && thighOk && level;
  if (aligned) return { hasBody: true, aligned: true, message: "✓ 位置正确，请保持不动", dir: "none" };

  // Guidance priority: size (distance) → horizontal → vertical → posture.
  if (!sized) {
    return sizeRatio > 1
      ? { hasBody: true, aligned: false, message: "请往后退一点", dir: "backwards" }
      : { hasBody: true, aligned: false, message: "请靠近一点", dir: "closer" };
  }
  if (!centered) {
    const displayDx = mirrored ? -dx : dx;
    return displayDx > 0
      ? { hasBody: true, aligned: false, message: "请往左移一点", dir: "left" }
      : { hasBody: true, aligned: false, message: "请往右移一点", dir: "right" };
  }
  if (!crownOk || !thighOk) {
    return { hasBody: true, aligned: false, message: "请调整站位，让头顶对齐上方参考线", dir: "none" };
  }
  return { hasBody: true, aligned: false, message: "请站直，肩膀保持水平", dir: "none" };
}
