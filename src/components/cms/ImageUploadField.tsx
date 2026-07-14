"use client";

import { useRef, useState } from "react";
import { uploadCmsImage } from "@/lib/cms/upload";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Manual URL entry stays available (e.g. an already-hosted product photo)
 * alongside a direct upload — uploading just fills in the same URL field. */
export function ImageUploadField({ label, value, onChange, disabled, placeholder }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    const result = await uploadCmsImage(file);
    setUploading(false);
    if (!result.ok || !result.url) {
      setError(result.error ?? "上传失败");
      return;
    }
    onChange(result.url);
  }

  return (
    <label className="flex flex-col gap-1.5 text-sm text-slate-600">
      {label}
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 text-lg text-slate-300">
            🖼️
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder ?? "https://..."}
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50"
            >
              {uploading ? "上传中..." : "📤 上传照片"}
            </button>
            {error && <span className="text-xs text-rose-500">{error}</span>}
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileSelected} className="hidden" />
        </div>
      </div>
    </label>
  );
}
