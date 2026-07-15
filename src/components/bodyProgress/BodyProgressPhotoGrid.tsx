"use client";

import { useState } from "react";
import { ZoomableImage } from "@/components/cms/ZoomableImage";
import type { BodyProgressAngle } from "@/lib/bodyProgress/types";

const ANGLE_LABELS: Record<BodyProgressAngle, string> = {
  front: "正面",
  left: "左侧",
  right: "右侧",
  back: "背面",
};

export interface BodyProgressPhotoGridItem {
  angle: BodyProgressAngle;
  url: string | null;
}

/** The one place that renders a record's four photos — used today by Record
 * Detail. Deliberately takes just a flat photo list (not a whole
 * BodyProgressRecord) so Sprint 004 can render this same component twice,
 * side by side, for a First-vs-Latest comparison view without any change
 * here. */
export function BodyProgressPhotoGrid({ photos }: { photos: BodyProgressPhotoGridItem[] }) {
  const [zoomed, setZoomed] = useState<BodyProgressPhotoGridItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <button
            key={photo.angle}
            type="button"
            onClick={() => photo.url && setZoomed(photo)}
            className="flex flex-col gap-1.5"
          >
            <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
              {photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt={ANGLE_LABELS[photo.angle]} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl text-slate-300">🧍</div>
              )}
            </div>
            <span className="text-xs font-medium text-slate-500">{ANGLE_LABELS[photo.angle]}</span>
          </button>
        ))}
      </div>

      {zoomed && (
        <div className="fixed inset-0 z-50 flex flex-col gap-3 bg-black/80 p-4" onClick={() => setZoomed(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex flex-1 flex-col justify-center gap-2">
            <p className="text-center text-sm font-medium text-white">{ANGLE_LABELS[zoomed.angle]}</p>
            {zoomed.url && <ZoomableImage src={zoomed.url} />}
          </div>
          <button type="button" onClick={() => setZoomed(null)} className="rounded-full bg-white/10 py-2 text-sm text-white">
            关闭
          </button>
        </div>
      )}
    </>
  );
}

export { ANGLE_LABELS };
