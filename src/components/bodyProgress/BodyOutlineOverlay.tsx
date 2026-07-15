/** Guidance-only body outline shown behind the capture viewfinder — purely
 * decorative, never blocks or validates submission. Kept as its own tiny
 * component with no props tying it to capture logic, so a future Designer
 * asset (a real SVG/illustration) can replace the contents here without
 * touching AnglePhotoSlot or the capture page. */
export function BodyOutlineOverlay() {
  return (
    <svg viewBox="0 0 120 240" className="pointer-events-none absolute inset-0 h-full w-full opacity-25" aria-hidden="true">
      <ellipse cx="60" cy="30" rx="18" ry="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" />
      <path
        d="M60 50 C30 55 25 90 28 130 C30 160 35 190 40 230 M60 50 C90 55 95 90 92 130 C90 160 85 190 80 230 M28 130 L92 130"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-emerald-500"
      />
    </svg>
  );
}
