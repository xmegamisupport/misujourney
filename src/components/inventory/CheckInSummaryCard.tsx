import type { DailyCheckIn } from "@/lib/inventory/types";

export function formatMonthDay(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
}

/** Cross-midnight duration from raw bedtime/wake_time strings — same rule as
 * record_morning_checkin()'s server-side calc: bedtime numerically >= wake
 * time means "last night", otherwise same calendar day as wake. Only used
 * as a fallback for rows recorded before sleep_duration_minutes existed. */
function formatSleepDurationFromTimes(bedtime: string, wakeTime: string): string {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let diff = wh * 60 + wm - (bh * 60 + bm);
  if (diff <= 0) diff += 24 * 60;
  return formatMinutes(diff);
}

export function sleepDurationLabel(record: DailyCheckIn): string {
  return record.sleepDurationMinutes != null ? formatMinutes(record.sleepDurationMinutes) : formatSleepDurationFromTimes(record.bedtime, record.wakeTime);
}

/** The one place that renders a single check-in's full detail — shared by
 * today's own "晨重详情" (checkin/page.tsx) and a past day's history detail
 * (checkin/history/[date]/page.tsx), so both always read and display the
 * exact same fields from the exact same daily_checkins row. */
export function CheckInSummaryCard({ record }: { record: DailyCheckIn }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
      <p>记录日期：{formatMonthDay(record.date)}</p>
      <p>体重：{record.weight}kg</p>
      <p>
        睡眠：昨晚 {record.bedtime} - 今天 {record.wakeTime}
      </p>
      <p>睡眠时长：{sleepDurationLabel(record)}</p>
      <p className="col-span-2">
        提交时间：
        {new Date(record.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
