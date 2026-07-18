"use client";

import { useMemo, useState } from "react";
import type { CmsPosterMediaItem } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

interface PosterCardViewerProps {
  media: CmsPosterMediaItem[];
  description?: string | null;
  altText?: string | null;
  onComplete?: () => void;
  completing?: boolean;
  /** Customer-facing large modal: drop the max-height cap so the poster uses the
   * full modal width and its natural height (never cropped — the modal body
   * scrolls if the poster is taller than the viewport). CMS staff previews keep
   * the default capped height. */
  fill?: boolean;
}

/** poster_upload's customer-facing viewer — the whole knowledge content is
 * one designed image, so no per-field Card Layout like ContentCardViewer:
 * just the poster (object-contain, never cropped), its optional short
 * description, and a page indicator + prev/next when there's more than one. */
export function PosterCardViewer({ media, description, altText, onComplete, completing, fill }: PosterCardViewerProps) {
  const sorted = useMemo(() => [...media].sort((a, b) => a.sortOrder - b.sortOrder), [media]);
  const [index, setIndex] = useState(0);
  const current = sorted[index];
  const isLast = index === sorted.length - 1;

  if (!current) {
    return <p className="px-4 py-10 text-center text-sm text-slate-400">这篇内容还没有上传海报</p>;
  }

  function handleNext() {
    if (index < sorted.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onComplete?.();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.length > 1 && <p className="text-center text-xs text-slate-400">{index + 1} / {sorted.length}</p>}

      <div className="flex justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.fileUrl}
          alt={altText ?? ""}
          className={cn("w-full object-contain", fill ? "h-auto" : "max-h-[70vh]")}
        />
      </div>

      {description && <p className="text-sm text-slate-600">{description}</p>}

      {sorted.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {sorted.map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-emerald-500" : "w-1.5 bg-slate-200")} />
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {sorted.length > 1 && index > 0 && (
          <button type="button" onClick={() => setIndex((i) => i - 1)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-300">
            上一张
          </button>
        )}
        <button
          type="button"
          disabled={completing}
          onClick={handleNext}
          className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {completing ? "完成中..." : isLast ? "我看完了" : "下一张"}
        </button>
      </div>
    </div>
  );
}
