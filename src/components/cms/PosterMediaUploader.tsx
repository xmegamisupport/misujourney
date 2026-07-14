"use client";

import { useRef, useState } from "react";
import { uploadCmsPosterImage, formatFileSize } from "@/lib/cms/upload";
import type { PosterMediaInput } from "@/lib/cms/engine";

const MAX_POSTERS = 5;

interface PosterMediaUploaderProps {
  media: PosterMediaInput[];
  onChange: (media: PosterMediaInput[]) => void;
  disabled?: boolean;
}

/** "增加下一张" up to MAX_POSTERS — append/remove only, no reorder in V1. */
export function PosterMediaUploader({ media, onChange, disabled }: PosterMediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    const result = await uploadCmsPosterImage(file);
    setUploading(false);
    if (!result.ok || !result.data) {
      setError(result.error ?? "上传失败");
      return;
    }
    onChange([...media, { fileUrl: result.data.url, width: result.data.width, height: result.data.height, aspectRatio: result.data.aspectRatio, fileSize: result.data.fileSize }]);
  }

  function handleRemove(index: number) {
    onChange(media.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-slate-700">海报图片（{media.length}/{MAX_POSTERS}）</p>

      {media.length > 0 && (
        <div className="flex flex-col gap-2">
          {media.map((m, i) => (
            <div key={m.fileUrl} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.fileUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1 text-xs text-slate-500">
                <p>海报 {i + 1}</p>
                <p>
                  {m.width ?? "?"}×{m.height ?? "?"}px · {m.aspectRatio ?? "—"} · {m.fileSize ? formatFileSize(m.fileSize) : "—"}
                </p>
              </div>
              {!disabled && (
                <button type="button" onClick={() => handleRemove(i)} className="shrink-0 text-xs font-medium text-rose-500">
                  移除
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && media.length < MAX_POSTERS && (
        <>
          <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileSelected} />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-60"
          >
            {uploading ? "上传中..." : media.length === 0 ? "+ 上传海报图片" : "+ 增加下一张"}
          </button>
          <p className="text-xs text-slate-400">支持 JPG / PNG / WEBP，单张最大 10MB，建议比例 4:5、1:1 或 9:16</p>
        </>
      )}

      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
