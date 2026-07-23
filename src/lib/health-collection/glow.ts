import type { BadgeView, GlowMessage, GlowSummary } from "./types";

/**
 * Turn the resolved habits into the Growth Card's evidence + a personal line.
 * This is where "you're glowing" is expressed as feeling, not a dashboard: the
 * numbers are simple, and the message speaks to where the customer actually is.
 */
export function buildGlow(views: BadgeView[]): { summary: GlowSummary; message: GlowMessage } {
  const habitsBuilt = views.filter((v) => v.levelIndex >= 0).length;
  const actionsCompleted = views.reduce((s, v) => s + v.lifetime, 0);
  const longestStreak = views.reduce((m, v) => Math.max(m, v.streak), 0);
  const summary: GlowSummary = { habitsBuilt, actionsCompleted, longestStreak };
  return { summary, message: pickMessage(summary) };
}

function pickMessage({ habitsBuilt, actionsCompleted, longestStreak }: GlowSummary): GlowMessage {
  if (actionsCompleted === 0) {
    return {
      headline: "✨ 每一次健康的选择，都会让你更闪耀。",
      sub: "最难的第一步，就从今天开始。",
    };
  }
  if (longestStreak >= 7) {
    return {
      headline: "🔥 你的坚持，正在改变未来的你。",
      sub: `连续 ${longestStreak} 天照顾好自己 —— 继续保持这份光。`,
    };
  }
  if (habitsBuilt >= 4) {
    return {
      headline: "🌱 你正在慢慢成为更健康的自己。",
      sub: "每一个好习惯，都在为未来的你加分。",
    };
  }
  return {
    headline: "👏 最难的第一步，你已经迈出。",
    sub: "继续下去，让健康慢慢成为生活的一部分。",
  };
}
