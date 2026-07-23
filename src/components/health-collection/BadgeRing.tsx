/** A circular progress ring with the badge icon at its centre. Pure display. */
export function BadgeRing({
  percent,
  color,
  icon,
  size = 96,
  stroke = 7,
  locked = false,
  dim = false,
}: {
  percent: number;
  color: string;
  icon: string;
  size?: number;
  stroke?: number;
  locked?: boolean;
  dim?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, percent));
  const offset = c * (1 - clamped);
  const track = locked ? "#e9ecef" : "#eef1f4";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {!locked && (
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
        style={{
          fontSize: size * 0.34,
          filter: locked ? "grayscale(1)" : undefined,
          opacity: locked || dim ? 0.45 : 1,
        }}
      >
        {icon}
      </span>
    </div>
  );
}
