import type { TrendPoint } from "@/lib/types";

interface TrendChartProps {
  data: TrendPoint[];
  unit?: string;
  strokeClass?: string;
  fillId?: string;
  height?: number;
}

export function TrendChart({ data, unit = "", strokeClass = "text-emerald-500", fillId = "trend-fill", height = 140 }: TrendChartProps) {
  if (data.length === 0) return null;

  const width = 320;
  const paddingX = 16;
  const paddingY = 20;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * (width - paddingX * 2);
    const y = paddingY + (1 - (d.value - min) / range) * (height - paddingY * 2);
    return { x, y, value: d.value, label: d.label };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - paddingY} L${points[0].x},${height - paddingY} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" className={strokeClass} />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={strokeClass} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${fillId})`} />
        <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={strokeClass} />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 4.5 : 3}
            fill="white"
            strokeWidth={2}
            stroke="currentColor"
            className={strokeClass}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{data[0].label}</span>
        <span className="font-medium text-slate-600">
          {data[data.length - 1].value}
          {unit}
        </span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}
