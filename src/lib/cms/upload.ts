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

const POSTER_MAX_BYTES = 10 * 1024 * 1024;
const POSTER_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface PosterImageMeta {
  url: string;
  width: number;
  height: number;
  aspectRatio: string;
  fileSize: number;
}

export interface UploadPosterImageResult {
  ok: boolean;
  data?: PosterImageMeta;
  error?: string;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      reject(new Error("无法读取图片"));
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  });
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function simplifyAspectRatio(width: number, height: number): string {
  const divisor = gcd(width, height) || 1;
  return `${width / divisor}:${height / divisor}`;
}

/** Same public bucket as uploadCmsImage(), 10MB per file per the poster spec
 * (vs 5MB for regular Template Engine images) — also reads and returns the
 * image's real dimensions/ratio/size so the poster form can show them and
 * the customer viewer can render without cropping. */
export async function uploadCmsPosterImage(file: File): Promise<UploadPosterImageResult> {
  if (!POSTER_ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: "只支持 JPG / PNG / WEBP 图片" };
  }
  if (file.size > POSTER_MAX_BYTES) {
    return { ok: false, error: "图片大小不能超过 10MB，请先压缩再上传" };
  }

  let dimensions: { width: number; height: number };
  try {
    dimensions = await readImageDimensions(file);
  } catch {
    return { ok: false, error: "无法读取图片尺寸，请换一张图片再试" };
  }

  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    ok: true,
    data: {
      url: data.publicUrl,
      width: dimensions.width,
      height: dimensions.height,
      aspectRatio: simplifyAspectRatio(dimensions.width, dimensions.height),
      fileSize: file.size,
    },
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
