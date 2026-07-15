"use client";

import { useSyncExternalStore } from "react";

function subscribeNoop() {
  return () => {};
}
function getClientHour() {
  return new Date().getHours();
}
function getServerHour() {
  return 8;
}
/** SSR-safe local hour (same pattern as the customer dashboard) so the
 * greeting doesn't mismatch between server render and client hydration. */
function useLocalHour(): number {
  return useSyncExternalStore(subscribeNoop, getClientHour, getServerHour);
}

function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 18) return "Good Afternoon";
  return "Good Evening";
}
function greetingEmoji(hour: number): string {
  if (hour >= 5 && hour < 18) return "☀️";
  return "🌙";
}

export function CoachGreeting({ coachName, celebrateCount, supportCount }: { coachName: string; celebrateCount: number; supportCount: number }) {
  const hour = useLocalHour();

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-sky-50/50 p-5">
      <p className="text-lg font-semibold text-slate-900">
        {greetingFor(hour)}, {coachName} {greetingEmoji(hour)}
      </p>
      <div className="mt-3 flex flex-col gap-1.5 text-sm text-slate-700">
        <p>🎉 {celebrateCount} 位顾客今天取得了有意义的进步。</p>
        <p>❤️ {supportCount} 位顾客今天可能需要你的鼓励。</p>
      </div>
      <p className="mt-3 text-sm font-medium text-emerald-700">今天也继续为他们带来改变 💚</p>
    </div>
  );
}
