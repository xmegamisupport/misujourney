"use client";

import { createClient } from "@/lib/supabase/client";
import { todayDateStr } from "@/lib/inventory/engine";
import type { Database, Json } from "@/lib/supabase/database.types";
import { ALLOWED_PHOTO_EXTENSIONS, BODY_PROGRESS_ANGLES, BODY_PROGRESS_BUCKET, BODY_PROGRESS_CYCLE_DAYS, SIGNED_URL_EXPIRY_SECONDS } from "./constants";
import type {
  BodyProgressAngle,
  BodyProgressCta,
  BodyProgressDueState,
  BodyProgressEngineResult,
  BodyProgressPhoto,
  BodyProgressRecord,
  SubmitBodyProgressInput,
  SubmitBodyProgressResult,
} from "./types";

type RecordRow = Database["public"]["Tables"]["body_progress_records"]["Row"];
type PhotoRow = Database["public"]["Tables"]["body_progress_photos"]["Row"];

function mapPhotoRow(row: PhotoRow): BodyProgressPhoto {
  return { id: row.id, angle: row.angle, originalPath: row.original_path };
}

function mapRecordRow(row: RecordRow, photos: BodyProgressPhoto[]): BodyProgressRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    journeyDay: row.journey_day,
    journeyPlanDays: row.journey_plan_days,
    submittedAt: row.submitted_at,
    weightValue: row.weight_value,
    weightUnit: row.weight_unit,
    sourceCheckinId: row.source_checkin_id,
    sourceCheckinDate: row.source_checkin_date,
    createdAt: row.created_at,
    photos,
  };
}

/** The exact path convention the submit_body_progress RPC independently
 * reconstructs and verifies — building it the same way here guarantees the
 * client always uploads to where the RPC will look. */
export function buildBodyProgressPath(customerId: string, recordId: string, angle: BodyProgressAngle, ext: string): string {
  return `${customerId}/${recordId}/${angle}.${ext.toLowerCase()}`;
}

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop();
  return (fromName || "jpg").toLowerCase();
}

/** Direct browser -> Storage upload under the customer's own session — the
 * Sprint 001 RLS policy (insert_own) is what actually enforces the customer
 * can only write inside their own folder; this function doesn't add any
 * security of its own, just the correct path + upsert-for-retries. */
export async function uploadBodyProgressPhoto(
  customerId: string,
  recordId: string,
  angle: BodyProgressAngle,
  file: File
): Promise<BodyProgressEngineResult<{ angle: BodyProgressAngle; ext: string }>> {
  const ext = extensionFromFile(file);
  if (!ALLOWED_PHOTO_EXTENSIONS.includes(ext)) {
    return { ok: false, error: "只支持 JPG / PNG / WEBP 图片" };
  }

  const supabase = createClient();
  const path = buildBodyProgressPath(customerId, recordId, angle, ext);
  const { error } = await supabase.storage.from(BODY_PROGRESS_BUCKET).upload(path, file, { cacheControl: "3600", upsert: true });
  if (error) return { ok: false, error: error.message };

  return { ok: true, data: { angle, ext } };
}

export interface UploadedBodyProgressPhoto {
  angle: BodyProgressAngle;
  ext: string;
  path: string;
}

/** Resumable uploads: lists what's already sitting in this record's Storage
 * folder so a customer who left mid-upload and came back with the same
 * recordId only has to (re)upload the angles that are still missing. Returns
 * full path/ext (not just the angle) since Review needs both to request
 * signed URLs and to build the submit_body_progress payload. */
export async function listUploadedBodyProgressPhotos(customerId: string, recordId: string): Promise<UploadedBodyProgressPhoto[]> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BODY_PROGRESS_BUCKET).list(`${customerId}/${recordId}`);
  if (error || !data) return [];

  const found: UploadedBodyProgressPhoto[] = [];
  for (const file of data) {
    const [angle, ext] = file.name.split(".");
    if ((BODY_PROGRESS_ANGLES as string[]).includes(angle)) {
      found.push({ angle: angle as BodyProgressAngle, ext, path: `${customerId}/${recordId}/${file.name}` });
    }
  }
  return BODY_PROGRESS_ANGLES.map((angle) => found.find((f) => f.angle === angle)).filter((f): f is UploadedBodyProgressPhoto => Boolean(f));
}

export async function getUploadedAngles(customerId: string, recordId: string): Promise<BodyProgressAngle[]> {
  return (await listUploadedBodyProgressPhotos(customerId, recordId)).map((p) => p.angle);
}

export async function getMissingAngles(customerId: string, recordId: string): Promise<BodyProgressAngle[]> {
  const uploaded = await getUploadedAngles(customerId, recordId);
  return BODY_PROGRESS_ANGLES.filter((angle) => !uploaded.includes(angle));
}

export async function submitBodyProgress(input: SubmitBodyProgressInput): Promise<BodyProgressEngineResult<SubmitBodyProgressResult>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_body_progress", {
    p_record_id: input.recordId,
    p_photos: input.photos.map((p) => ({ angle: p.angle, ext: p.ext })) as Json,
  });
  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; alreadyRecorded: boolean; recordId: string; journeyDay: number };
  return { ok: true, data: { alreadyRecorded: result.alreadyRecorded, recordId: result.recordId, journeyDay: result.journeyDay } };
}

export async function getBodyProgressHistory(customerId: string): Promise<BodyProgressRecord[]> {
  const supabase = createClient();
  const { data: recordRows, error: recordError } = await supabase
    .from("body_progress_records")
    .select("*")
    .eq("customer_id", customerId)
    .order("submitted_at", { ascending: false });
  if (recordError) throw recordError;
  if (!recordRows || recordRows.length === 0) return [];

  const { data: photoRows, error: photoError } = await supabase
    .from("body_progress_photos")
    .select("*")
    .in(
      "record_id",
      recordRows.map((r) => r.id)
    );
  if (photoError) throw photoError;

  const photosByRecord = new Map<string, BodyProgressPhoto[]>();
  for (const row of photoRows ?? []) {
    const list = photosByRecord.get(row.record_id) ?? [];
    list.push(mapPhotoRow(row));
    photosByRecord.set(row.record_id, list);
  }

  return recordRows.map((row) => mapRecordRow(row, photosByRecord.get(row.id) ?? []));
}

/** Reuses the same "fetch full history once, find() the id" pattern already
 * proven for check-in history detail — no separate by-id query, and it
 * inherits the same "can't leak another customer's row via URL tampering"
 * property since the underlying query is still fully RLS-scoped. */
export async function getBodyProgressRecord(customerId: string, recordId: string): Promise<BodyProgressRecord | undefined> {
  const history = await getBodyProgressHistory(customerId);
  return history.find((r) => r.id === recordId);
}

export async function getFirstBodyProgressRecord(customerId: string): Promise<BodyProgressRecord | undefined> {
  const history = await getBodyProgressHistory(customerId);
  return history[history.length - 1];
}

export async function getLatestBodyProgressRecord(customerId: string): Promise<BodyProgressRecord | undefined> {
  const history = await getBodyProgressHistory(customerId);
  return history[0];
}

/** Never getPublicUrl() — the bucket is private. Signed URLs are requested
 * fresh at display time and are not persisted anywhere. */
export async function getBodyProgressPhotoSignedUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BODY_PROGRESS_BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function getSignedUrlsForRecord(record: BodyProgressRecord): Promise<Record<string, string | null>> {
  const entries = await Promise.all(record.photos.map(async (photo) => [photo.angle, await getBodyProgressPhotoSignedUrl(photo.originalPath)] as const));
  return Object.fromEntries(entries);
}

/** Sprint 002 deliberately has no "draft" table — a record only exists once
 * fully submitted. To resume across app restarts (or a different device)
 * without repeating the water-intake mistake (client-side state as source of
 * truth), this lists the customer's own Storage folders and returns the
 * first one that has at least one uploaded photo but no matching completed
 * record — i.e. an abandoned or interrupted submission. Fully server-truth
 * based: no localStorage, nothing to go stale. */
export async function findInProgressBodyProgressRecordId(customerId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BODY_PROGRESS_BUCKET).list(customerId);
  if (error || !data) return null;

  const completedIds = new Set((await getBodyProgressHistory(customerId)).map((r) => r.id));

  for (const entry of data) {
    if (completedIds.has(entry.name)) continue;
    const uploaded = await getUploadedAngles(customerId, entry.name);
    if (uploaded.length > 0) return entry.name;
  }
  return null;
}

/** Pure computed fact-reporting — no reminder UI, no Coach Dashboard/
 * attention-flag writes. Uses the same 4am-shifted "today" the rest of the
 * app already uses (todayDateStr()), not raw calendar math. */
export async function getBodyProgressDueState(customerId: string): Promise<BodyProgressDueState> {
  const history = await getBodyProgressHistory(customerId);
  if (history.length === 0) {
    return { firstRecordCompleted: false, nextDueDate: null, daysRemaining: null, isOverdue: false };
  }

  const latest = history[0];
  const submittedDate = latest.submittedAt.slice(0, 10);
  const nextDue = new Date(`${submittedDate}T00:00:00Z`);
  nextDue.setUTCDate(nextDue.getUTCDate() + BODY_PROGRESS_CYCLE_DAYS);
  const nextDueDate = nextDue.toISOString().slice(0, 10);

  const today = new Date(`${todayDateStr()}T00:00:00Z`);
  const daysRemaining = Math.round((nextDue.getTime() - today.getTime()) / 86400000);

  return { firstRecordCompleted: true, nextDueDate, daysRemaining, isOverdue: daysRemaining < 0 };
}

/** Single source of truth for "which one CTA do we show" — an existing
 * in-progress upload always wins (abandoning already-uploaded photos would
 * be wasteful), then "no record yet", then the due-date gate for recurring
 * submissions (never offered early), then just browsing history. Both the
 * Dashboard card and the Home page call this so they can never disagree. */
export function resolveBodyProgressCta(dueState: BodyProgressDueState, inProgressRecordId: string | null): BodyProgressCta {
  if (inProgressRecordId) return { kind: "continue_upload", recordId: inProgressRecordId };
  if (!dueState.firstRecordCompleted) return { kind: "build_starting_point" };
  if (dueState.daysRemaining !== null && dueState.daysRemaining <= 0) return { kind: "start_body_progress" };
  return { kind: "view_growth_journey" };
}

export const BODY_PROGRESS_CTA_LABEL: Record<BodyProgressCta["kind"], string> = {
  build_starting_point: "记录我的起点",
  continue_upload: "继续上传",
  start_body_progress: "开始身形记录",
  view_growth_journey: "查看我的成长记录",
};

/** Single source of truth for "where does tapping the CTA go" — reused by
 * both the Dashboard card and the Home page so they can never point
 * somewhere different for the same state. */
export function bodyProgressCtaHref(cta: BodyProgressCta): string {
  switch (cta.kind) {
    case "build_starting_point":
      return "/customer/progress/body/guide";
    case "continue_upload":
      return `/customer/progress/body/capture?recordId=${cta.recordId}&mode=library`;
    case "start_body_progress":
      return "/customer/progress/body/guide";
    case "view_growth_journey":
      return "/customer/progress/body/history";
  }
}
