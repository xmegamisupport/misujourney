// Lifestyle baseline options — stored as stable codes, shown as real-life
// descriptions. Non-judgmental: these are habits, never diagnoses.

export interface BaselineOption {
  code: string;
  label: string;
}

/** 🚽 平时有每天排便的习惯吗？ — habit, not a constipation label. */
export const BOWEL_HABIT_OPTIONS: BaselineOption[] = [
  { code: "daily", label: "几乎每天都有" },
  { code: "occasional_skip", label: "偶尔会跳过一天" },
  { code: "infrequent", label: "经常两天以上才一次" },
];

/** 💧 平时有达到每天建议的喝水量吗？ — compared against the customer's own
 * personalised target, never asked in cups/bottles/ml. */
export const HYDRATION_HABIT_OPTIONS: BaselineOption[] = [
  { code: "rarely", label: "很少喝水，通常不到目标的一半" },
  { code: "forgetful", label: "偶尔会喝，但经常忘记补充水分" },
  { code: "mostly", label: "大部分时候都有喝到建议的饮水量" },
  { code: "always", label: "几乎每天都能喝足够，甚至超过建议饮水量" },
];

export const BOWEL_HABIT_LABEL: Record<string, string> = Object.fromEntries(BOWEL_HABIT_OPTIONS.map((o) => [o.code, o.label]));
export const HYDRATION_HABIT_LABEL: Record<string, string> = Object.fromEntries(HYDRATION_HABIT_OPTIONS.map((o) => [o.code, o.label]));
