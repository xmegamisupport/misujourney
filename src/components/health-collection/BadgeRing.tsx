/**
 * A circular progress ring with the badge icon at its centre. Pure display.
 *
 * The ring uses a single MISU-brand emerald (passed in) — never metal/game
 * colours. Only the fill amount changes; a not-yet-started habit simply shows
 * an empty ring and a full-colour icon (inviting, never greyed out).
 */
export function BadgeRing({
  percent,
  color,
  icon,
  size = 96,
  stroke = 7,
}: {
  percent: number;
  color: string;
  icon: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, percent));
  const offset = c * (1 - clamped);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#edf1ef" strokeWidth={stroke} />
        {clamped > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset .6s ease" }}
          />
        )}
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontSize: size * 0.34 }}
      >
        {icon}
      </span>
    </div>
  );
}
