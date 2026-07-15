"use client";

import { calculateCurrentDay } from "@/lib/journey";
import { todayDateStr } from "@/lib/inventory/engine";
import type { CoachCustomerContext } from "./workspace";
import { deriveSupport } from "./workspace";
import type { TimelineEvent } from "./workspace-types";

function toUtc(d: string): number {
  return new Date(`${d}T00:00:00Z`).getTime();
}

/** A simple, read-only Journey history for the Focus View so a Coach grasps
 * the whole arc without navigating away. Derived entirely from existing data. */
export function buildJourneyTimeline(ctx: CoachCustomerContext, today = todayDateStr()): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (ctx.startDate) events.push({ kind: "journey_started", label: "Journey 开始", date: ctx.startDate });

  if (ctx.bodyProgress.length >= 1) {
    events.push({ kind: "first_body_progress", label: "首次身形记录", date: ctx.bodyProgress[ctx.bodyProgress.length - 1].submittedAt.slice(0, 10) });
  }

  if (ctx.checkIns.length >= 1) {
    const lowest = [...ctx.checkIns].sort((a, b) => a.weight - b.weight)[0];
    events.push({ kind: "new_lowest_weight", label: `最低体重 ${lowest.weight}kg`, date: lowest.date });
  }

  if (ctx.startDate && ctx.journeyDays) {
    const journeyDay = calculateCurrentDay(ctx.startDate);
    if (journeyDay >= ctx.journeyDays) {
      events.push({ kind: "journey_completed", label: "Journey 完成", date: new Date(toUtc(ctx.startDate) + ctx.journeyDays * 86400000).toISOString().slice(0, 10) });
    }
  }

  // Recent missed check-ins (last 7 days)
  const weekAgo = new Date(toUtc(today) - 6 * 86400000).toISOString().slice(0, 10);
  const recentCheckins = new Set(ctx.checkIns.filter((c) => c.date >= weekAgo && c.date <= today).map((c) => c.date));
  const missed = 7 - recentCheckins.size;
  if (missed > 0) events.push({ kind: "recent_missed_checkins", label: `最近 7 天缺少 ${missed} 次晨重打卡`, date: null });

  // Recent support signal (current)
  const support = deriveSupport(ctx, today);
  if (support) events.push({ kind: "recent_support_signal", label: support.reasons[0].text, date: null });

  // Newest first, undated notes last.
  return events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}
