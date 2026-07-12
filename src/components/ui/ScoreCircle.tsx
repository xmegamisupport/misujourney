interface ScoreCircleProps {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  colorClass?: string;
  trackClass?: string;
}

export function ScoreCircle({
  value,
  max = 100,
  size = 96,
  label,
  colorClass = "text-emerald-500",
  trackClass = "text-emerald-100",
}: ScoreCircleProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(1, value / max));
  const offset = circumference * (1 - percent);
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} strokeWidth={10} className={trackClass} stroke="currentColor" fill="none" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={10}
          className={colorClass}
          stroke="currentColor"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-semibold text-slate-900">{value}</span>
        {label && <span className="text-[11px] text-slate-400">{label}</span>}
      </div>
    </div>
  );
}
