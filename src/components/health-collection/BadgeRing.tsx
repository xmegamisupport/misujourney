/**
 * A circular progress ring with the badge icon at its centre. Pure display.
 *
 * The ring uses a single MISU-brand emerald (passed in) — never metal/game
 * colours. `muted` renders a not-yet-started habit in grey with a dimmed icon,
 * so the overview instantly shows which habits are already being built.
 */
export function BadgeRing({
  percent,
  color,
  icon,
  size = 96,
  stroke = 7,
  muted = false,
}: {
  percent: number;
  color: string;
  icon: string;
  size?: number;
  stroke?: number;
  muted?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, percent));
  const offset = c * (1 - clamped);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={muted ? "#e9edf0" : "#edf1ef"} strokeWidth={stroke} />
        {!muted && clamped > 0 && (
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
        style={{ fontSize: size * 0.34, filter: muted ? "grayscale(1)" : undefined, opacity: muted ? 0.4 : 1 }}
      >
        {icon}
      </span>
    </div>
  );
}
