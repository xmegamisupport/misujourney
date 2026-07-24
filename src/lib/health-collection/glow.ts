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

/**
 * A message system that speaks to where the customer actually is. Keyed off the
 * "peak" of their journey (best streak or total actions), so it grows with them
 * — from the very first step to a life that has genuinely changed.
 */
function pickMessage({ actionsCompleted, longestStreak }: GlowSummary): GlowMessage {
  if (actionsCompleted === 0) {
    return { headline: "🌱 每一个健康习惯，都从第一步开始。", sub: "今天，就迈出它。" };
  }
  const peak = Math.max(longestStreak, actionsCompleted);
  if (peak >= 90) {
    return { headline: "❤️ 真正改变你的，不是一天，而是每一天。", sub: "" };
  }
  if (peak >= 30) {
    return { headline: "🌸 健康，已经慢慢成为你的生活方式。", sub: "" };
  }
  if (peak >= 7) {
    return { headline: "✨ 坚持，比完美更重要。", sub: "" };
  }
  return { headline: "🌱 最难的第一步，你已经迈出。", sub: "" };
}
