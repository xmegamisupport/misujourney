"use client";

/** Semi-transparent body-outline guide drawn over the live camera. White while
 * guiding, cyan-green once the customer is correctly positioned. viewBox is a
 * 0-100 percentage grid mapped to the preview (preserveAspectRatio none), so it
 * lines up with the framing standard in alignment.ts: crown ~7%, shoulders,
 * vertical centre line, body-width guide, mid-thigh ending line at ~90%. */
export function AlignmentOverlay({ aligned }: { aligned: boolean }) {
  const stroke = aligned ? "#34d399" : "rgba(255,255,255,0.9)";
  const fill = aligned ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.06)";

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ transition: "color 250ms ease" }}
      aria-hidden="true"
    >
      <g style={{ transition: "stroke 250ms ease, fill 250ms ease" }} stroke={stroke} fill={fill} strokeWidth={0.7} strokeLinejoin="round">
        {/* head */}
        <circle cx={50} cy={11} r={7} />
        {/* torso: shoulders → waist → hips */}
        <path d="M 39 20 L 61 20 L 58 44 L 57 58 L 43 58 L 42 44 Z" />
        {/* upper thighs down to the mid-thigh ending line */}
        <path d="M 43 58 L 49 58 L 49 88 L 44 88 Z" />
        <path d="M 51 58 L 57 58 L 56 88 L 51 88 Z" />
      </g>

      {/* vertical centre line */}
      <line x1={50} y1={2} x2={50} y2={98} stroke={stroke} strokeWidth={0.35} strokeDasharray="2 2" style={{ transition: "stroke 250ms ease" }} />
      {/* shoulder alignment line */}
      <line x1={33} y1={20} x2={67} y2={20} stroke={stroke} strokeWidth={0.35} strokeDasharray="2 2" style={{ transition: "stroke 250ms ease" }} />
      {/* mid-thigh ending line */}
      <line x1={6} y1={90} x2={94} y2={90} stroke={stroke} strokeWidth={0.45} strokeDasharray="3 2" style={{ transition: "stroke 250ms ease" }} />
    </svg>
  );
}
