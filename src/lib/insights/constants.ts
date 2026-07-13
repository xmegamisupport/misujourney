import type { FlagSeverity } from "./types";

/** Fixed catalogue of every flag_type the rule engine can emit — "只用于
 * 提醒Coach，不代表医疗判断", so severity is capped at info/attention/
 * important (no danger/critical tier). */
export const FLAG_LABELS: Record<string, string> = {
  no_bowel_movement_3d: "连续3天无排便",
  no_bowel_movement_needs_attention: "排便情况需要关注",
  frequent_gathering: "本周聚餐较多",
  frequent_eating_out: "外食较多",
  frequent_late_night: "本周多次熬夜",
  high_stress: "近期压力较大",
  recent_sick: "近期身体不适",
  menstruation: "生理期记录",
  low_checkin_completion: "近期打卡减少",
  insufficient_data: "数据不足",
};

export const FLAG_SEVERITY: Record<string, FlagSeverity> = {
  no_bowel_movement_3d: "attention",
  no_bowel_movement_needs_attention: "important",
  frequent_gathering: "info",
  frequent_eating_out: "info",
  frequent_late_night: "attention",
  high_stress: "attention",
  recent_sick: "important",
  menstruation: "info",
  low_checkin_completion: "attention",
  insufficient_data: "info",
};

export const SEVERITY_STYLES: Record<FlagSeverity, string> = {
  info: "bg-sky-50 text-sky-600",
  attention: "bg-amber-50 text-amber-700",
  important: "bg-rose-50 text-rose-600",
};

export const ANALYSIS_TYPE_DAYS = {
  weekly_7_day: 7,
  biweekly_14_day: 14,
} as const;
