"use client";

import { useRef } from "react";
import type { BodyProgressAngle } from "@/lib/bodyProgress/types";
import { cn } from "@/lib/utils";

interface AnglePhotoSlotProps {
  angle: BodyProgressAngle;
  label: string;
  photoUrl: string | null;
  uploading: boolean;
  /** "camera" hints the OS picker to open the camera directly; "library"
   * leaves it plain. Either way the OS picker still lets the customer choose
   * the other source too — this is a hint, never a restriction. */
  mode?: "camera" | "library";
  onSelectFile: (file: File) => void;
  /** "current" = the prominent in-focus slot during sequential capture;
   * "done" = a small completed chip shown for earlier angles; "grid" = the
   * equal-sized tile used on the Review screen. */
  variant?: "current" | "done" | "grid";
}

export function AnglePhotoSlot({ angle, label, photoUrl, uploading, mode, onSelectFile, variant = "current" }: AnglePhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onSelectFile(file);
    e.target.value = "";
  }

  const capture = mode === "camera" ? "environment" : undefined;

  if (variant === "done") {
    return (
      <button
        type="button"
        data-angle={angle}
        onClick={() => inputRef.current?.click()}
        className="flex shrink-0 flex-col items-center gap-1"
        aria-label={`重新拍摄${label}`}
      >
        <div className="relative h-14 w-14 overflow-hidden rounded-xl border-2 border-emerald-300 bg-slate-50">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={label} className="h-full w-full object-cover" />
          )}
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">✓</span>
        </div>
        <span className="text-[11px] text-slate-400">{label}</span>
        <input ref={inputRef} type="file" accept="image/*" capture={capture} className="hidden" onChange={handleChange} />
      </button>
    );
  }

  return (
    <div data-angle={angle} className={cn("flex flex-col items-center gap-3", variant === "grid" && "gap-2")}>
      {/* The preview box is only shown when there's something to show — a taken
          photo, an in-progress upload, or a Review grid tile. In the sequential
          capture step the real example photo above is the only reference, so an
          empty placeholder box is intentionally not rendered. */}
      {(variant === "grid" || photoUrl || uploading) && (
        <div
          className={cn(
            "relative flex items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-slate-50",
            variant === "current" ? "h-72 w-56" : "h-32 w-full",
            photoUrl ? "border-emerald-300 border-solid" : "border-slate-200"
          )}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl text-slate-300">🧍</span>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-500">上传中...</div>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {photoUrl ? `重新拍摄${variant === "grid" ? "" : label}` : `拍摄${variant === "grid" ? "" : label}`}
      </button>

      <input ref={inputRef} type="file" accept="image/*" capture={capture} className="hidden" onChange={handleChange} />
    </div>
  );
}
