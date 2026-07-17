// Body-framing standard + real-time alignment math for the guided camera.
// Pure and deterministic (no DOM/ML) so it can be reasoned about and unit
// tested; the camera component feeds it pose landmarks each frame.
//
// Framing standard (normalised frame coords, y downward, 0 = top):
//   • head crown ~7% from the top (5-8% headroom)
//   • frame ends at mid-thigh (~90%)
//   • body centred on the vertical mid-line
//   • ~8-12% margin left/right
// Capturing head→mid-thigh (not the whole body) keeps the face, arms, waist,
// abdomen, hips and upper thighs large and comparable across Day 1/30/60/90.

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
    return this.midThighY - this.headTopY; // ~0.83
  },
  // Tolerances (fractions of the frame). Deliberately generous — the goal is
  // "close enough for a consistent comparison", not pixel perfection. Tune on
  // a real device.
  dxTol: 0.06,
  sizeTol: 0.12,
  crownBand: 0.09,
  thighBand: 0.1,
  shoulderLevelTol: 0.06,
  minVisibility: 0.5,
} as const;

export type AlignmentDir = "left" | "right" | "closer" | "backwards" | "none";

export interface AlignmentResult {
  hasBody: boolean;
  aligned: boolean;
  /** Customer-facing guidance for the current frame. */
  message: string;
  dir: AlignmentDir;
}

function vis(l: PoseLandmark | undefined): boolean {
  return !!l && (l.visibility === undefined || l.visibility >= FRAMING.minVisibility);
}

/** Evaluate one frame of pose landmarks against the framing standard.
 * `mirrored` flips only the left/right guidance so it matches a selfie-mirrored
 * preview (the body position math is unaffected). */
export function computeAlignment(landmarks: PoseLandmark[] | null | undefined, mirrored = true): AlignmentResult {
  const need = [LM.nose, LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip];
  const haveCore = !!landmarks && need.every((i) => vis(landmarks[i]));
  const hasThigh = !!landmarks && ((vis(landmarks[LM.leftHip]) && vis(landmarks[LM.leftKnee])) || (vis(landmarks[LM.rightHip]) && vis(landmarks[LM.rightKnee])));
  if (!landmarks || !haveCore || !hasThigh) {
    return { hasBody: false, aligned: false, message: "请站进画面里，让全身进入镜头", dir: "none" };
  }

  const headPoints = [LM.nose, LM.leftEye, LM.rightEye, LM.leftEar, LM.rightEar]
    .map((i) => landmarks[i])
    .filter(vis)
    .map((l) => l.y);
  const crownY = Math.max(0, Math.min(...headPoints) - 0.04); // crown sits above eyes/ears

  const centerX = (landmarks[LM.leftShoulder].x + landmarks[LM.rightShoulder].x + landmarks[LM.leftHip].x + landmarks[LM.rightHip].x) / 4;

  const thighYs: number[] = [];
  if (vis(landmarks[LM.leftHip]) && vis(landmarks[LM.leftKnee])) thighYs.push((landmarks[LM.leftHip].y + landmarks[LM.leftKnee].y) / 2);
  if (vis(landmarks[LM.rightHip]) && vis(landmarks[LM.rightKnee])) thighYs.push((landmarks[LM.rightHip].y + landmarks[LM.rightKnee].y) / 2);
  const midThighY = thighYs.reduce((a, b) => a + b, 0) / thighYs.length;

  const bodyHeight = midThighY - crownY;
  const sizeRatio = bodyHeight / FRAMING.targetBodyHeight;
  const dx = centerX - FRAMING.centerX;
  const shoulderLevel = Math.abs(landmarks[LM.leftShoulder].y - landmarks[LM.rightShoulder].y);

  const sized = Math.abs(sizeRatio - 1) <= FRAMING.sizeTol;
  const centered = Math.abs(dx) <= FRAMING.dxTol;
  const crownOk = Math.abs(crownY - FRAMING.headTopY) <= FRAMING.crownBand;
  const thighOk = Math.abs(midThighY - FRAMING.midThighY) <= FRAMING.thighBand;
  const level = shoulderLevel <= FRAMING.shoulderLevelTol;
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
