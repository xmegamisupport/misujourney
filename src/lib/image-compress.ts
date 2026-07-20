"use client";

/** Downscale + re-encode a camera photo before it goes anywhere.
 *
 * A modern phone shoots 3000–4000px, 2–5MB. Nothing downstream needs that:
 *
 *   • Storage grows with every meal, forever. This is the difference between
 *     tens of GB a month and a couple.
 *   • Upload happens twice — once to the vision API, once to Storage — often on
 *     mobile data. A slow upload is the most common way a photo simply fails to
 *     be kept at all, so this makes the picture MORE likely to exist, not less.
 *   • Vision cost scales with dimensions, not file size: the model tiles the
 *     image, so a 4032px photo is billed as many more tiles than a 1600px one.
 *
 * MAX_EDGE is the one number worth arguing about. It is deliberately generous:
 * MISU sachet recognition depends on reading small packaging text, and that is
 * the first thing to break if this is set too low. 1600px keeps a sachet on a
 * dinner plate comfortably legible while still cutting a 4MB photo to a few
 * hundred KB. Lower it only with a real before/after comparison on MISU packets.
 */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export interface CompressedPhoto {
  blob: Blob;
  /** Object URL for preview; the caller owns revoking it. */
  url: string;
}

/** Compress if we can, pass the original through if we cannot.
 *
 * Every failure path returns a usable photo rather than an error: an old
 * browser, a HEIC the canvas cannot decode, a memory limit on a huge image —
 * none of those are worth blocking a meal record over. The cost of falling back
 * is a larger upload, not a broken flow. */
export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  const passthrough = (): CompressedPhoto => ({ blob: file, url: URL.createObjectURL(file) });

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return passthrough();

  try {
    // imageOrientation:"from-image" applies the EXIF rotation flag. Without it
    // a photo taken in portrait is drawn sideways onto the canvas — the picture
    // the coach reviews would be rotated even though the camera roll looks fine.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return passthrough();
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return passthrough();

    // A tiny or already-optimised original can come out larger after re-encode.
    // Keep whichever is actually smaller.
    if (blob.size >= file.size) return passthrough();

    return { blob, url: URL.createObjectURL(blob) };
  } catch {
    return passthrough();
  }
}
