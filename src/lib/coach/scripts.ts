import type { CelebrationType, CoachScript, ScriptRenderContext, ScriptSituation, SupportType } from "./workspace-types";

export const COACH_SCRIPT_VARIABLES = [
  "CustomerName",
  "CoachName",
  "JourneyName",
  "JourneyDay",
  "CurrentWeight",
  "LowestWeight",
  "RemainingProducts",
  "SupportReason",
  "CurrentChallenge",
] as const;

/** XMEGAMI Coaching Scripts — placeholder copy for MVP; XMEGAMI Product to
 * refine. Each teaches an on-culture way to communicate, with variables the
 * Coach can keep, edit, or ignore entirely. No AI. */
export const COACH_SCRIPTS: Record<ScriptSituation, CoachScript> = {
  missed_checkin: {
    situation: "missed_checkin",
    intent: "reconnect",
    tone: "温柔、不带责备",
    script:
      "Hi {{CustomerName}} 😊 我是你的 Coach {{CoachName}}。最近几天没看到你的打卡，一切都还好吗？Journey 不追求完美，只要愿意继续就很棒。今天要不要一起重新开始？",
    variables: ["CustomerName", "CoachName"],
  },
  low_consistency: {
    situation: "low_consistency",
    intent: "encourage",
    tone: "鼓励、陪伴",
    script:
      "Hi {{CustomerName}}，你已经走到 {{JourneyName}} 第 {{JourneyDay}} 天了 💪 最近节奏有点慢没关系，我们一步一步来。有什么让你分心的地方，都可以告诉我。",
    variables: ["CustomerName", "JourneyName", "JourneyDay"],
  },
  journey_consistency: {
    situation: "journey_consistency",
    intent: "reconnect",
    tone: "关心、主动",
    script:
      "Hi {{CustomerName}} 😊 最近你的参与好像慢下来了（{{CurrentChallenge}}）。这很正常，人都有起伏。我在这里陪着你，今天先从一个小动作开始，好吗？",
    variables: ["CustomerName", "CurrentChallenge"],
  },
  repurchase: {
    situation: "repurchase",
    intent: "repurchase_support",
    tone: "贴心提醒、不推销",
    script:
      "Hi {{CustomerName}}，看到你的 MISU 快用完了（剩 {{RemainingProducts}}）。为了让 {{JourneyName}} 不中断，要不要我帮你安排补货？有任何问题都可以问我 😊",
    variables: ["CustomerName", "RemainingProducts", "JourneyName"],
  },
  journey_completed: {
    situation: "journey_completed",
    intent: "celebrate",
    tone: "热情、肯定",
    script:
      "🎉 {{CustomerName}}，恭喜你完成了 {{JourneyName}}！这一路的坚持真的很不容易，为你感到骄傲。我们一起看看接下来想怎么走，好吗？",
    variables: ["CustomerName", "JourneyName"],
  },
  new_lowest_weight: {
    situation: "new_lowest_weight",
    intent: "celebrate",
    tone: "开心、真诚",
    script:
      "🎉 {{CustomerName}}，你今天来到新的最低体重 {{CurrentWeight}}kg 了！这是你一天天努力的成果。继续保持，我为你开心 💚",
    variables: ["CustomerName", "CurrentWeight"],
  },
  first_body_progress: {
    situation: "first_body_progress",
    intent: "celebrate",
    tone: "温暖、鼓励",
    script:
      "🎉 {{CustomerName}}，你完成了第一次身形记录！这是未来的你会感谢现在的你的起点。谢谢你愿意开始，我们一起走下去 😊",
    variables: ["CustomerName"],
  },
};

/** Fills {{Variables}} from context; unknown/empty variables degrade
 * gracefully to a neutral placeholder rather than leaving raw braces. */
export function renderScript(template: string, context: Partial<ScriptRenderContext>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = (context as Record<string, string | undefined>)[key];
    return value && value.length > 0 ? value : "…";
  });
}

const SUPPORT_TO_SITUATION: Partial<Record<SupportType, ScriptSituation>> = {
  participation_gap: "journey_consistency",
  consistency_declining: "journey_consistency",
  low_consistency: "low_consistency",
  missed_evening_reflection: "missed_checkin",
  attention_flag: "low_consistency",
  insufficient_data: "missed_checkin",
  repurchase: "repurchase",
  out_of_stock: "repurchase",
  body_progress_overdue: "low_consistency",
  journey_completion_due: "journey_completed",
  goal_weight_due: "low_consistency",
};

const CELEBRATION_TO_SITUATION: Partial<Record<CelebrationType, ScriptSituation>> = {
  goal_weight_achieved: "new_lowest_weight",
  transformation_complete: "journey_completed",
  momentum_complete: "journey_completed",
  kickstart_complete: "journey_completed",
  first_body_progress: "first_body_progress",
  new_lowest_weight: "new_lowest_weight",
  streak_30: "low_consistency",
  streak_7: "low_consistency",
};

export function scriptForSupport(type: SupportType): CoachScript {
  return COACH_SCRIPTS[SUPPORT_TO_SITUATION[type] ?? "low_consistency"];
}

export function scriptForCelebration(type: CelebrationType): CoachScript {
  return COACH_SCRIPTS[CELEBRATION_TO_SITUATION[type] ?? "journey_completed"];
}
