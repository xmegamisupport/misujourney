import { BODY_PROGRESS_GUIDE_OVERVIEW, BODY_PROGRESS_GUIDE_ANGLES } from "@/lib/bodyProgress/guide-assets";

/** Real example photos for the Body Progress guide. Reads every path from the
 * guide-assets manifest — no hardcoded paths — so the photos can be replaced
 * by overwriting the files in /public/images/body-progress-guide/ with no code
 * change. Photos are the primary instruction; the customer should understand
 * the angles at a glance. */
export function PhotoGuideExamples() {
  return (
    <div className="flex flex-col gap-4">
      <figure className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BODY_PROGRESS_GUIDE_OVERVIEW.src}
          alt={BODY_PROGRESS_GUIDE_OVERVIEW.label}
          loading="lazy"
          className="w-full object-contain"
        />
      </figure>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BODY_PROGRESS_GUIDE_ANGLES.map((img) => (
          <figure key={img.angle} className="flex flex-col gap-1.5">
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.label} loading="lazy" className="h-full w-full object-cover" />
            </div>
            <figcaption className="text-center text-xs font-medium text-slate-500">{img.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
