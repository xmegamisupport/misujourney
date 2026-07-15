export type BodyProgressAngle = "front" | "left" | "right" | "back";

export interface BodyProgressPhoto {
  id: string;
  angle: BodyProgressAngle;
  originalPath: string;
}

export interface BodyProgressRecord {
  id: string;
  customerId: string;
  journeyDay: number;
  journeyPlanDays: number;
  submittedAt: string;
  weightValue: number | null;
  weightUnit: string | null;
  sourceCheckinId: string | null;
  sourceCheckinDate: string | null;
  createdAt: string;
  photos: BodyProgressPhoto[];
}

export interface SubmitBodyProgressPhotoInput {
  angle: BodyProgressAngle;
  ext: string;
}

export interface SubmitBodyProgressInput {
  recordId: string;
  photos: SubmitBodyProgressPhotoInput[];
}

export interface SubmitBodyProgressResult {
  alreadyRecorded: boolean;
  recordId: string;
  journeyDay: number;
}

export interface BodyProgressDueState {
  firstRecordCompleted: boolean;
  nextDueDate: string | null;
  daysRemaining: number | null;
  isOverdue: boolean;
}

export interface BodyProgressEngineResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

/** The five CTA states from the Sprint 003 spec. Exactly one is ever shown —
 * "the system decides" — computed once (resolveBodyProgressCta in engine.ts)
 * and reused identically by the Dashboard card and the Body Progress Home
 * page, so the two can never disagree about what to show. */
export type BodyProgressCta =
  | { kind: "build_starting_point" }
  | { kind: "continue_upload"; recordId: string }
  | { kind: "start_body_progress" }
  | { kind: "view_growth_journey" };

export interface BodyProgressHomeState {
  loading: boolean;
  history: BodyProgressRecord[];
  dueState: BodyProgressDueState;
  inProgressRecordId: string | null;
  cta: BodyProgressCta;
}
