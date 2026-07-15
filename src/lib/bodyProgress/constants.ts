import type { BodyProgressAngle } from "./types";

export const BODY_PROGRESS_BUCKET = "body-progress-photos";

export const BODY_PROGRESS_ANGLES: BodyProgressAngle[] = ["front", "left", "right", "back"];

export const ALLOWED_PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export const BODY_PROGRESS_CYCLE_DAYS = 14;

export const SIGNED_URL_EXPIRY_SECONDS = 60 * 10;
