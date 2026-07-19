import type { BowelMovementLevel, SpecialCondition } from "@/lib/checkout/types";

/** ── ❤️ MISU 想告诉你 — the copy library ──────────────────────────────────
 *
 * This is MISU's voice. Edit the strings here; the engine never generates text.
 * Deterministic and curated on purpose — an LLM would drift in tone, risk health
 * claims, and read exactly like the assistant voice we're trying not to be.
 *
 * EVERY message follows the three-beat structure, in this order, any beat
 * optional but never reordered:
 *   ① Explain   — name the cause, before the number
 *   ② Reassure  — what it does NOT mean
 *   ③ Suggest   — gentle, permission-shaped, at most one ("如果方便的话")
 * A message that opens with ③ is a to-do, not a companion. Rewrite it.
 *
 * Rules for anyone editing:
 *   • Never moralise. Banned: 作弊 · 破功 · 罪恶感 · 补回来 · 乖 · 失控 · 加油
 *   • Never claim certainty — 可能 / 通常, never 一定是
 *   • Never reference data she didn't give us
 *   • One suggestion per message. Two is a lecture.
 *   • ❤️ on tier 1–2 only. Used every day it becomes wallpaper.
 *   • Match the words to the tone. A `celebrate` message must not explain or
 *     reassure — praise that arrives wrapped in caveats stops being praise.
 *   • Tier 0 ≈ 25 chars · tier 1 ≈ 60 · tier 2 ≈ 120. Longer belongs elsewhere.
 *
 * The gate on every line: **does she feel more understood than corrected?**
 * If no, rewrite. (One exception: safety, where correction IS the caring act.)
 */

/** 0 = a quiet line, no chrome · 1–2 = a highlighted block inside the weight
 * card, 2 being the strongest. Reserve the highlight for days that genuinely
 * need guidance — always prominent = never prominent. */
export type MisuTier = 0 | 1 | 2;

/** WHICH highlight — a message is not just loud or quiet, it has a temperature.
 *
 *   support   — rose. Something needs explaining or softening: weight up,
 *               生理期, 聚餐, a plateau ahead, several days away.
 *   celebrate — emerald. Something went right: weight down, all five done,
 *               a milestone reached.
 *
 * Praising her inside the same pink box used to calm her down after a bad
 * weigh-in makes the praise read as consolation. Same prominence, opposite
 * feeling — and the customer reads the colour before she reads the words. */
export type MisuTone = "support" | "celebrate";

/** Above this, a gain is worth explaining. Below it, it is noise — and
 * dramatising noise is how we teach her to fear the scale. Day-to-day water
 * swing is routinely 0.3–0.5kg and means nothing. */
const SIGNIFICANT_GAIN_KG = 0.5;

/** Weights are entered to 0.1kg; rounding keeps 68.7 − 68.2 from landing at
 * 0.5000000000000071 and counting as significant. */
const weightDelta = (c: MisuVoiceContext): number | null =>
  c.latestWeight === null || c.previousWeight === null ? null : Math.round((c.latestWeight - c.previousWeight) * 100) / 100;

export type MisuFamily = "reactive" | "proactive" | "recognition" | "normal";

/** Lower runs first. Address the wound before the applause: a streak
 * celebration on a day she gained weight reads as tone-deaf. */
export const MISU_PRIORITY = {
  safety: 10,
  anxiety: 20,
  proactive: 25,
  explanation: 30,
  recognition: 40,
  normal: 90,
} as const;

export interface MisuVoiceContext {
  journeyDay: number;
  tasksDone: number;
  tasksTotal: number;
  /** null = has never weighed in. */
  daysSinceLastWeighIn: number | null;
  latestWeight: number | null;
  previousWeight: number | null;
  yesterdayConditions: SpecialCondition[];
  yesterdayBowel: BowelMovementLevel | null;
  todayBowel: BowelMovementLevel | null;
  /** 0–100+ of today's water target. */
  waterPercent: number;
  localHour: number;
}

export interface MisuTrigger {
  id: string;
  family: MisuFamily;
  tier: MisuTier;
  /** Only read when tier > 0 — a quiet line has no colour to get wrong. */
  tone: MisuTone;
  priority: number;
  matches: (c: MisuVoiceContext) => boolean;
  variants: string[];
}

const has = (c: MisuVoiceContext, ...k: SpecialCondition[]) => k.some((x) => c.yesterdayConditions.includes(x));

export const MISU_TRIGGERS: MisuTrigger[] = [
  // ── Anxiety ────────────────────────────────────────────────────────────
  {
    // The cruellest day in fat loss: did everything, scale went up anyway.
    id: "effort_but_weight_up",
    family: "reactive",
    tier: 2,
    tone: "support",
    priority: MISU_PRIORITY.anxiety,
    // Same size threshold as weight_up: on a 0.2kg wobble there is nothing to
    // reassure her about, and treating it as a crisis creates the fear.
    matches: (c) => c.tasksDone >= c.tasksTotal - 1 && (weightDelta(c) ?? 0) > SIGNIFICANT_GAIN_KG,
    variants: [
      "昨天你几乎每一件都完成了，今天体重却往上了一点。这两件事没有矛盾 —— 身体储水的变化，常常会盖过真正在发生的改变。你做的没有白费。❤️",
      "你昨天很稳定，今天数字却不太配合。脂肪不会在一天之内长出来 —— 今天的数字，多半只是水。❤️",
      "做对的事和数字下降，不会每天同步发生。这几天的努力还在，只是还没显示出来。❤️",
    ],
  },
  {
    id: "weight_up",
    family: "reactive",
    tier: 2,
    tone: "support",
    priority: MISU_PRIORITY.anxiety + 1,
    matches: (c) => (weightDelta(c) ?? 0) > SIGNIFICANT_GAIN_KG,
    variants: [
      "今天数字往上了一点。体重每天都会浮动 —— 水分、盐分、睡眠都会影响它，一天的数字不代表趋势。❤️",
      "今天比上次高了一些。脂肪不会一天之内长出来，那多半是水分。过两天再看会更准。❤️",
      "数字上去了一点。这在过程里很常见，不代表方向变了。❤️",
    ],
  },
  {
    // A small gain is noise. She still gets an answer — just not an alarm.
    id: "weight_up_slight",
    family: "reactive",
    tier: 0,
    tone: "support",
    priority: MISU_PRIORITY.anxiety + 3,
    matches: (c) => {
      const d = weightDelta(c);
      return d !== null && d > 0 && d <= SIGNIFICANT_GAIN_KG;
    },
    variants: [
      "今天有一点点浮动，这个幅度多半是水分。",
      "数字微微上去了一点，属于正常范围。",
      "今天差一点点，不影响趋势。",
    ],
  },
  {
    id: "period",
    family: "reactive",
    tier: 2,
    tone: "support",
    priority: MISU_PRIORITY.anxiety + 2,
    matches: (c) => has(c, "period"),
    variants: [
      "这几天身体会比平常多留一些水分，体重浮动一两公斤都很正常，过几天就会回来。这段时间对自己温柔一点。❤️",
      "生理期这几天，体重和情绪都可能起伏。那不是你做错什么，是身体本来的节奏。❤️",
      "这段时间不用要求自己做到平常的标准。休息也是 Journey 的一部分。❤️",
    ],
  },

  // ── Proactive — day-driven. The plateau warning is the credibility builder.
  {
    id: "day1_welcome",
    family: "proactive",
    tone: "support",
    tier: 2,
    priority: MISU_PRIORITY.proactive,
    matches: (c) => c.journeyDay === 1,
    variants: [
      "欢迎来到你的 Journey。第一週体重可能会上上下下，那多半是水分 —— 前七天先把节奏建立起来就好，数字之后再说。❤️",
    ],
  },
  {
    id: "day3_rhythm",
    family: "proactive",
    tone: "support",
    tier: 1,
    priority: MISU_PRIORITY.proactive,
    matches: (c) => c.journeyDay === 3,
    variants: ["第三天了。这几天先不用盯着数字，把每天的节奏建立起来比较重要。❤️"],
  },
  {
    id: "day8_plateau_warning",
    family: "proactive",
    tone: "support",
    tier: 2,
    priority: MISU_PRIORITY.proactive,
    matches: (c) => c.journeyDay === 8,
    variants: [
      "先提前告诉你一件事：很多人在第二、三週会遇到体重停滞。如果之后发生了，不是你做错什么 —— 那是身体正常的一段过程。❤️",
    ],
  },
  {
    id: "day14_two_weeks",
    family: "proactive",
    tone: "celebrate",
    tier: 2,
    priority: MISU_PRIORITY.proactive,
    matches: (c) => c.journeyDay === 14,
    variants: ["两週了。这时候身边的人通常还看不出来，但你的身体已经在变。❤️"],
  },
  {
    id: "day21_three_weeks",
    family: "proactive",
    tone: "celebrate",
    tier: 1,
    priority: MISU_PRIORITY.proactive,
    matches: (c) => c.journeyDay === 21,
    variants: ["三週了。是不是开始觉得，这些事没有一开始那么费力了？❤️"],
  },
  {
    id: "day30_one_month",
    family: "proactive",
    tone: "celebrate",
    tier: 2,
    priority: MISU_PRIORITY.proactive,
    matches: (c) => c.journeyDay === 30,
    variants: ["一个月了。回头看看第一天的照片 —— 有些改变，数字是看不出来的。❤️"],
  },

  // ── Explanation ────────────────────────────────────────────────────────
  {
    id: "gathering",
    family: "reactive",
    tone: "support",
    tier: 1,
    priority: MISU_PRIORITY.explanation,
    matches: (c) => has(c, "gathering", "eating_out"),
    variants: [
      "昨天有聚餐，今天体重可能会高一点 —— 那多半是钠和水分，不是脂肪。生活本来就会有这样的日子。❤️",
      "聚餐之后身体会多留一些水分，通常两三天就回来了，不需要急着补回来。❤️",
      "昨天外食比较多，今天可能会觉得身体有点胀。那是钠，不是脂肪 —— 今天多喝点水会舒服些。❤️",
      "一顿饭不会决定你的进度。回来继续就好，这也是 Journey 的一部分。❤️",
    ],
  },
  {
    id: "late_night",
    family: "reactive",
    tone: "support",
    tier: 1,
    priority: MISU_PRIORITY.explanation + 1,
    matches: (c) => has(c, "late_night"),
    variants: [
      "昨天睡得比较晚。睡不够的时候，身体会更容易觉得饿、也更容易留住水分 —— 那不是意志力的问题。❤️",
      "昨晚熬夜了。今天如果特别想吃东西，那是荷尔蒙在说话，不是你不够克制。❤️",
      "昨天睡得晚，今天不用要求自己表现得跟平常一样好。❤️",
    ],
  },
  {
    id: "sick_or_stress",
    family: "reactive",
    tone: "support",
    tier: 1,
    priority: MISU_PRIORITY.explanation + 2,
    matches: (c) => has(c, "sick", "stress"),
    variants: [
      "昨天身体不太舒服。这种时候能维持基本的节奏，就已经足够了。❤️",
      "压力大的时候，体重和食欲都可能不太稳定 —— 那是正常的，不是你失控了。❤️",
    ],
  },
  {
    id: "travel",
    family: "reactive",
    tone: "support",
    tier: 1,
    priority: MISU_PRIORITY.explanation + 3,
    matches: (c) => has(c, "travel"),
    variants: [
      "出差的时候很难维持平常的节奏，这很正常。回到日常再继续就好。❤️",
      "在外面的时候，能做到几件就几件。Journey 不会因为几天而中断。❤️",
    ],
  },
  {
    id: "constipation",
    family: "reactive",
    tone: "support",
    tier: 1,
    priority: MISU_PRIORITY.explanation + 4,
    matches: (c) => c.yesterdayBowel === "none" && c.todayBowel === "none",
    variants: [
      "这两天排便不太顺，水分和纤维通常是最直接的原因。今天多喝一点水，身体会舒服一些。❤️",
      "排便不顺的时候，体重也会跟着虚高一点。那不是脂肪，等身体顺了就会回来。❤️",
    ],
  },
  {
    id: "no_weighin",
    family: "reactive",
    tone: "support",
    tier: 1,
    priority: MISU_PRIORITY.explanation + 5,
    // Also covers "never weighed in" — deliberately not framed as a failure.
    matches: (c) => c.daysSinceLastWeighIn === null || c.daysSinceLastWeighIn >= 3,
    variants: [
      "体重只是众多讯号中的一个。你今天完成的这些事，本身就已经在改变身体了。❤️",
      "还没量体重也没关系。它只是帮你看清楚身体的变化，不是用来打分数的。❤️",
      "有几天没量体重了。想量的时候再量就好 —— 数字不是成绩单。❤️",
    ],
  },
  {
    id: "low_water",
    family: "reactive",
    tone: "support",
    tier: 1,
    priority: MISU_PRIORITY.explanation + 6,
    matches: (c) => c.localHour >= 18 && c.waterPercent < 50,
    variants: [
      "今天的水还没跟上。不用一次补完，接下来几杯慢慢来就好。❤️",
      "今天水喝得比较少。补一点水，通常会让隔天的身体感觉轻一些。❤️",
    ],
  },

  // ── Recognition ────────────────────────────────────────────────────────
  {
    id: "all_tasks_done",
    family: "recognition",
    tone: "celebrate",
    tier: 1,
    priority: MISU_PRIORITY.recognition,
    matches: (c) => c.tasksDone >= c.tasksTotal,
    variants: [
      "今天全部完成了。真正改变身体的，从来不是某一天做得特别好，而是很多普通的一天，你都愿意继续完成。❤️",
      "今天做完了。这样的一天不会立刻显示在数字上，但身体会记得。❤️",
      "全部完成了。谢谢你今天没有把它留到明天。❤️",
      "今天五件都完成了。这不是自律，是你愿意对自己好一点。❤️",
    ],
  },
  {
    id: "weight_down",
    family: "recognition",
    tone: "celebrate",
    tier: 1,
    priority: MISU_PRIORITY.recognition + 1,
    matches: (c) => c.latestWeight !== null && c.previousWeight !== null && c.latestWeight < c.previousWeight,
    variants: [
      "今天数字降了一点。那是你这几天的节奏累积出来的结果，不是运气。❤️",
      "体重往下走了一些。继续保持你现在的做法就好。❤️",
    ],
  },

  // ── Normal day — the default. Warm, short, no ❤️. ───────────────────────
  {
    id: "normal_day",
    family: "normal",
    tone: "support",
    tier: 0,
    priority: MISU_PRIORITY.normal,
    matches: () => true,
    variants: [
      "今天没什么特别的，这样就很好。",
      "平稳的一天，也是有效的一天。",
      "今天照常就好，不用特别用力。",
      "普通的一天，也在累积。",
      "今天也在往前，只是安静一点。",
      "慢慢来，不用急。",
    ],
  },
];
