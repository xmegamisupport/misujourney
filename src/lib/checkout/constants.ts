import type { BowelMovementLevel, SpecialCondition } from "./types";

export const BOWEL_MOVEMENT_LABELS: Record<BowelMovementLevel, string> = {
  none: "没有",
  once: "1次",
  two_or_more: "2次以上",
};

export const SPECIAL_CONDITION_OPTIONS: { value: SpecialCondition; label: string }[] = [
  { value: "gathering", label: "聚餐" },
  { value: "eating_out", label: "外食较多" },
  { value: "period", label: "来月经" },
  { value: "late_night", label: "熬夜" },
  { value: "sick", label: "生病" },
  { value: "stress", label: "压力较大" },
  { value: "travel", label: "出差" },
  { value: "other", label: "其他" },
];
