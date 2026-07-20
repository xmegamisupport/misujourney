"use client";

import { createClient } from "@/lib/supabase/client";

export const MEAL_PHOTO_BUCKET = "meal-photos";
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

function extensionFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

/** Upload the meal photo, and report only the extension.
 *
 * The path is never sent to the server: record_meal() rebuilds
 * {customer_id}/{meal_id}.{ext} from values it already trusts and then checks
 * Storage for it. So the client cannot claim a photo it did not upload, nor
 * point a meal at someone else's file.
 *
 * Returns null on any failure rather than throwing. A photo is worth having,
 * but it is never worth losing the meal over — the caller records either way. */
export async function uploadMealPhoto(customerId: string, mealId: string, blobUrl: string): Promise<string | null> {
  try {
    // The photo lives as a blob URL from the moment it was chosen, through the
    // confirm and result steps. Re-reading it here means the upload happens
    // once, at the moment she commits, instead of for every abandoned draft.
    const response = await fetch(blobUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size === 0) return null;

    const ext = extensionFromMime(blob.type);
    if (!ALLOWED_EXTENSIONS.includes(ext)) return null;

    const supabase = createClient();
    const { error } = await supabase.storage
      .from(MEAL_PHOTO_BUCKET)
      .upload(`${customerId}/${mealId}.${ext}`, blob, { cacheControl: "3600", upsert: true, contentType: blob.type || "image/jpeg" });

    return error ? null : ext;
  } catch {
    // A reload between choosing the photo and confirming kills the blob URL.
    // Expected, not exceptional.
    return null;
  }
}

/** Private bucket, so viewing needs a short-lived signed URL. Access is decided
 * by Storage RLS — the customer herself, her coach, or an admin — not here. */
export async function getMealPhotoUrl(photoPath: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(MEAL_PHOTO_BUCKET).createSignedUrl(photoPath, SIGNED_URL_EXPIRY_SECONDS);
  return error ? null : (data?.signedUrl ?? null);
}
