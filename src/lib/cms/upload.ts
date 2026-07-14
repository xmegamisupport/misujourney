"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "cms-content-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface UploadImageResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** Uploads to the public cms-content-images bucket and returns its public
 * URL — customers view it directly, no signed-URL/auth round trip needed. */
export async function uploadCmsImage(file: File): Promise<UploadImageResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: "只支持 JPG / PNG / WEBP / GIF 图片" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "图片大小不能超过 5MB" };
  }

  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
