import { BODY_PROGRESS_GUIDE_OVERVIEW } from "@/lib/bodyProgress/guide-assets";

/** The single overview reference image for the Body Progress guide. Reads its
 * path from the guide-assets manifest — no hardcoded paths — so it can be
 * replaced by overwriting the file in /public/images/body-progress-guide/.
 * Per-angle reference images appear only on their own capture step, never
 * here, so the overview page stays a single, calm "understand the purpose"
 * screen. */
export function PhotoGuideExamples() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BODY_PROGRESS_GUIDE_OVERVIEW.src}
        alt={BODY_PROGRESS_GUIDE_OVERVIEW.label}
        loading="lazy"
        className="w-full object-contain"
      />
    </figure>
  );
}
