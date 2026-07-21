import type { VolumeCoverTheme } from "@/lib/living-garden/chapters";

/** An illustrated cover, drawn — not an emoji, not a photo.
 *
 * A few layered SVG shapes (sky, a glowing orb, two hill silhouettes, a lone
 * tree, a scatter of sparkles) read as a premium illustrated journal rather than
 * a game menu. The whole illustration is themed from data, so every future
 * volume is a new palette, not new code. Purely decorative — aria-hidden. */
export function VolumeCover({ theme, muted = false }: { theme: VolumeCoverTheme; muted?: boolean }) {
  const sparkles = [
    { x: 54, y: 70, r: 2.2 },
    { x: 92, y: 48, r: 1.4 },
    { x: 208, y: 92, r: 1.8 },
    { x: 268, y: 60, r: 1.3 },
    { x: 150, y: 40, r: 1.6 },
  ];

  return (
    <svg
      viewBox="0 0 320 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={muted ? { filter: "saturate(0.55) brightness(0.9)" } : undefined}
    >
      <defs>
        <linearGradient id={`sky-${theme.sky1}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.sky1} />
          <stop offset="100%" stopColor={theme.sky2} />
        </linearGradient>
        <radialGradient id={`glow-${theme.orb}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={theme.orb} stopOpacity="0.9" />
          <stop offset="100%" stopColor={theme.orb} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="320" height="400" fill={`url(#sky-${theme.sky1})`} />

      {/* Orb + soft glow */}
      <circle cx="236" cy="112" r="92" fill={`url(#glow-${theme.orb})`} />
      <circle cx="236" cy="112" r="34" fill={theme.orb} opacity="0.95" />

      {/* Sparkles */}
      {sparkles.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={theme.accent} opacity="0.75" />
      ))}

      {/* Far hills */}
      <path d="M0,296 Q80,250 168,286 T320,272 L320,400 L0,400 Z" fill={theme.hillBack} />

      {/* A lone tree, standing between the hills */}
      <g>
        <rect x="72" y="300" width="7" height="34" rx="3" fill={theme.trunk} />
        <circle cx="75.5" cy="294" r="22" fill={theme.hillFront} />
        <circle cx="62" cy="304" r="15" fill={theme.hillFront} />
        <circle cx="90" cy="304" r="15" fill={theme.hillFront} />
      </g>

      {/* Near hills */}
      <path d="M0,338 Q104,302 210,336 T320,326 L320,400 L0,400 Z" fill={theme.hillFront} />

      {/* A few blossoms on the near hill, so the plate reads as a garden. */}
      {[
        { x: 40, y: 356 },
        { x: 132, y: 366 },
        { x: 210, y: 360 },
        { x: 276, y: 372 },
      ].map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r="4" fill={theme.accent} opacity="0.9" />
          <circle cx={f.x} cy={f.y} r="1.6" fill="#fff" opacity="0.85" />
        </g>
      ))}

      {/* Gentle vignette for depth */}
      <rect width="320" height="400" fill="black" opacity="0.04" />
    </svg>
  );
}
