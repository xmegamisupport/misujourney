"use client";

import { calculateCurrentDay, calculateStreakDays } from "@/lib/journey";
import { todayDateStr } from "@/lib/inventory/engine";
import { getMyCustomers, getCustomerProfile } from "./engine";
import { getCheckInsForCustomers, getTransactionsForCustomers, getInventoryForCustomers, getActiveAlerts } from "@/lib/inventory/engine";
import { getCheckoutsForCustomers } from "@/lib/checkout/engine";
import { getGoalPlansForCustomers, getCustomerGoalsForCustomers } from "@/lib/goals/engine";
import { getBodyProgressRecordsForCustomers } from "@/lib/bodyProgress/engine";
import { getActiveAttentionFlagsForCustomers } from "@/lib/insights/engine";
import { buildMisuParticipationSignals } from "./participation";
import { assessConsistency } from "./consistency";
import {
  CELEBRATION_RULES,
  CELEBRATION_PRIORITY_ORDER,
  CELEBRATION_TAG,
  SUPPORT_RULES,
  SUPPORT_PRIORITY_ORDER,
  SUPPORT_TAG,
  LOW_CHECKIN_RATE,
  INSUFFICIENT_DATA_CHECKINS,
  journeyNameFor,
  overallRankFor,
} from "./workspace-config";
import type {
  CelebrationItem,
  CelebrationType,
  CoachCustomerCard,
  CoachImpact,
  CoachWorkspace,
  CustomerSignalTag,
  JourneyState,
  SupportItem,
  SupportPriority,
  SupportReasonLine,
  SupportType,
} from "./workspace-types";
import type { DailyCheckIn, InventoryTransaction, CustomerInventory, RepurchaseAlert } from "@/lib/inventory/types";
import type { EveningCheckout } from "@/lib/checkout/types";
import type { BodyProgressRecord } from "@/lib/bodyProgress/types";
import type { CustomerGoal, GoalPlan } from "@/lib/goals/types";
import type { AttentionFlag } from "@/lib/insights/types";

/** Days into the Journey before a still-missing first Body Progress becomes
 * a (gentle) support signal — configurable. */
const BODY_PROGRESS_FIRST_OVERDUE_DAY = 7;
const BODY_PROGRESS_CYCLE_DAYS = 14;

export interface CoachCustomerContext {
  id: string;
  name: string;
  avatar: string | null;
  phone: string | null;
  startDate: string | null;
  journeyDays: number | null;
  goal: CustomerGoal | undefined;
  checkIns: DailyCheckIn[];
  checkouts: EveningCheckout[];
  transactions: InventoryTransaction[];
  inventory: CustomerInventory[];
  bodyProgress: BodyProgressRecord[];
  flags: AttentionFlag[];
  repurchaseAlerts: RepurchaseAlert[];
}

function toUtc(d: string): number {
  return new Date(`${d}T00:00:00Z`).getTime();
}
function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

// ---------- Celebrations ----------

const CELEBRATION_NARRATIVE: Record<CelebrationType, (name: string) => string> = {
  goal_weight_achieved: (n) => `${n} 达成了阶段目标体重，值得好好庆祝！`,
  transformation_complete: (n) => `${n} 完成了 90 天 Transformation Journey，是重要的里程碑。`,
  momentum_complete: (n) => `${n} 完成了 60 天 Momentum Journey，值得肯定。`,
  kickstart_complete: (n) => `${n} 完成了 30 天 Kickstart Journey，迈出了坚实的一步。`,
  first_body_progress: (n) => `${n} 完成了第一次身形记录，为自己留下了起点。`,
  new_lowest_weight: (n) => `${n} 今天达到了新的最低体重，是鼓励 TA 的好时机。`,
  streak_30: (n) => `${n} 已连续打卡 30 天，非常自律！`,
  streak_7: (n) => `${n} 已连续打卡 7 天，保持得很好。`,
};

export function deriveCelebrations(ctx: CoachCustomerContext, today = todayDateStr()): CelebrationItem[] {
  const items: CelebrationItem[] = [];
  const journeyDay = ctx.startDate ? calculateCurrentDay(ctx.startDate) : 1;
  const journeyName = journeyNameFor(ctx.journeyDays);
  const checkInsAsc = [...ctx.checkIns].sort((a, b) => a.date.localeCompare(b.date));
  const checkInsDesc = [...ctx.checkIns].sort((a, b) => b.date.localeCompare(a.date));

  const push = (type: CelebrationType, occurredOn: string) => {
    items.push({
      customerId: ctx.id,
      customerName: ctx.name,
      avatar: ctx.avatar,
      type,
      priority: CELEBRATION_RULES[type].priority,
      journeyDay,
      journeyName,
      reasonNarrative: CELEBRATION_NARRATIVE[type](ctx.name),
      occurredOn,
    });
  };
  const withinWindow = (occurredOn: string, type: CelebrationType): boolean => {
    const rule = CELEBRATION_RULES[type];
    const age = daysBetween(occurredOn, today);
    if (age < 0) return false;
    return rule.visibility === "today" ? age === 0 : age <= rule.visibility;
  };

  // Journey completion
  if (ctx.startDate && ctx.journeyDays && journeyDay >= ctx.journeyDays) {
    const completedOn = new Date(toUtc(ctx.startDate) + ctx.journeyDays * 86400000).toISOString().slice(0, 10);
    const type: CelebrationType = ctx.journeyDays === 90 ? "transformation_complete" : ctx.journeyDays === 60 ? "momentum_complete" : "kickstart_complete";
    if (withinWindow(completedOn, type)) push(type, completedOn);
  }

  // Goal weight achieved (stage goal) — crossing within window
  if (ctx.goal && checkInsAsc.length >= 1) {
    const latest = checkInsAsc[checkInsAsc.length - 1];
    const prev = checkInsAsc.length >= 2 ? checkInsAsc[checkInsAsc.length - 2] : null;
    const crossedNow = latest.weight <= ctx.goal.stageGoalWeightMax && (!prev || prev.weight > ctx.goal.stageGoalWeightMax);
    if (crossedNow && withinWindow(latest.date, "goal_weight_achieved")) push("goal_weight_achieved", latest.date);
  }

  // New lowest weight — today only, needs a prior to be "new"
  if (checkInsAsc.length >= 2) {
    const latest = checkInsAsc[checkInsAsc.length - 1];
    const priorMin = Math.min(...checkInsAsc.slice(0, -1).map((c) => c.weight));
    if (latest.date === today && latest.weight < priorMin) push("new_lowest_weight", today);
  }

  // Streaks — milestone crossing, today only
  if (checkInsDesc.length > 0 && checkInsDesc[0].date === today) {
    const streak = calculateStreakDays(checkInsDesc);
    if (streak === 30) push("streak_30", today);
    else if (streak === 7) push("streak_7", today);
  }

  // First Body Progress — the oldest record submitted within window
  if (ctx.bodyProgress.length >= 1) {
    const firstSubmitted = ctx.bodyProgress[ctx.bodyProgress.length - 1].submittedAt.slice(0, 10);
    if (withinWindow(firstSubmitted, "first_body_progress")) push("first_body_progress", firstSubmitted);
  }

  return items;
}

// ---------- Support ----------

function bodyProgressOverdue(ctx: CoachCustomerContext, journeyDay: number, today: string): boolean {
  if (ctx.bodyProgress.length === 0) return journeyDay >= BODY_PROGRESS_FIRST_OVERDUE_DAY;
  const latest = ctx.bodyProgress[0].submittedAt.slice(0, 10); // desc → newest first
  return daysBetween(latest, today) > BODY_PROGRESS_CYCLE_DAYS;
}

export function deriveSupport(ctx: CoachCustomerContext, today = todayDateStr()): SupportItem | null {
  const journeyDay = ctx.startDate ? calculateCurrentDay(ctx.startDate) : 1;
  const cappedDay = ctx.journeyDays ? Math.min(journeyDay, ctx.journeyDays) : journeyDay;
  const journeyName = journeyNameFor(ctx.journeyDays);
  const collected: { type: SupportType; priority: SupportPriority; text: string }[] = [];

  const add = (type: SupportType, tier: SupportPriority, text: string) => {
    collected.push({ type, priority: tier, text });
  };

  // Journey Consistency (participation gap + decline) — product-independent engine
  const signals = buildMisuParticipationSignals({
    checkIns: ctx.checkIns,
    checkouts: ctx.checkouts,
    transactions: ctx.transactions,
    bodyProgress: ctx.bodyProgress,
  });
  const consistency = assessConsistency(signals, journeyDay, today);
  if (consistency.tier && consistency.humanMessage) {
    const gap = consistency.daysSinceLastActivity ?? 0;
    const type: SupportType = gap >= 3 ? "participation_gap" : "consistency_declining";
    add(type, consistency.tier, `Journey 参与度下降：${consistency.humanMessage}`);
  }

  // Attention flags → tier by severity
  for (const flag of ctx.flags) {
    const tier: SupportPriority = flag.severity === "important" ? "urgent" : flag.severity === "attention" ? "attention" : "reminder";
    add("attention_flag", tier, flag.flagLabel);
  }

  // Repurchase / out of stock
  for (const alert of ctx.repurchaseAlerts) {
    if (alert.alertLevel === "OUT_OF_STOCK") add("out_of_stock", "urgent", "产品已用完，需要尽快回购");
    else add("repurchase", "attention", "产品即将用完，需要提醒回购");
  }

  // Low check-in consistency
  if (journeyDay >= 4 && ctx.checkIns.length / cappedDay < LOW_CHECKIN_RATE) {
    add("low_consistency", "attention", "近期打卡率偏低");
  }

  // Body Progress overdue
  if (bodyProgressOverdue(ctx, journeyDay, today)) {
    add("body_progress_overdue", "attention", "身形记录已到期，建议提醒 TA 记录");
  }

  // Missed evening reflection — a gentle nudge
  const lastCheckout = [...ctx.checkouts].sort((a, b) => b.checkoutDate.localeCompare(a.checkoutDate))[0];
  if (journeyDay >= 2 && (!lastCheckout || daysBetween(lastCheckout.checkoutDate, today) >= 2)) {
    add("missed_evening_reflection", "reminder", "最近的睡前回顾还没完成");
  }

  // Insufficient data (new customer)
  if (ctx.checkIns.length < INSUFFICIENT_DATA_CHECKINS) {
    add("insufficient_data", "reminder", "资料还不足，可以多鼓励 TA 参与");
  }

  if (collected.length === 0) return null;

  collected.sort((a, b) => SUPPORT_PRIORITY_ORDER[a.priority] - SUPPORT_PRIORITY_ORDER[b.priority]);
  const primary = collected[0];
  const reasons: SupportReasonLine[] = collected.map((c) => ({ type: c.type, text: c.text, priority: c.priority }));
  const reasonNarrative = `${collected.slice(0, 3).map((c) => c.text).join("；")}。建议今天主动关心 TA。`;

  return {
    customerId: ctx.id,
    customerName: ctx.name,
    avatar: ctx.avatar,
    primaryType: primary.type,
    category: SUPPORT_RULES[primary.type].category,
    priority: primary.priority,
    journeyDay: cappedDay,
    journeyName,
    reasonNarrative,
    reasons,
  };
}

// ---------- Home aggregation: one card per customer ----------

const EMPTY_IMPACT: CoachImpact = { totalCustomers: 0, activeJourney: 0, journeysCompleted: 0, journeysPaused: 0, journeysCompletedThisMonth: 0 };

/** Whether a customer's Journey is currently paused. The full pause workflow
 * (pregnancy, medical, financial, personal, motivation) is NOT part of the
 * MVP — there is no pause data source yet, so this is always false today. The
 * state is modelled now so the dashboard, statistics and daily workspace stay
 * consistent once pausing ships: a paused customer is counted separately and
 * leaves the daily Customer Workspace. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isJourneyPaused(ctx: CoachCustomerContext): boolean {
  // TODO: read the customer's Journey pause status when the pause workflow ships.
  return false;
}

/** Active until the elapsed Journey days reach its duration, then completed —
 * unless the Journey has been explicitly paused. */
function deriveJourneyState(ctx: CoachCustomerContext): JourneyState {
  if (isJourneyPaused(ctx)) return "paused";
  if (ctx.startDate && ctx.journeyDays && calculateCurrentDay(ctx.startDate) >= ctx.journeyDays) return "completed";
  return "active";
}

/** Aggregate every celebration + support signal for one customer into a
 * single glanceable card. Returns null when the customer has no signal today
 * (they don't belong on the Home). */
function buildCustomerCard(ctx: CoachCustomerContext, celebrations: CelebrationItem[], support: SupportItem | null): CoachCustomerCard | null {
  const celebrationTags: CustomerSignalTag[] = celebrations.map((c) => {
    const tag = CELEBRATION_TAG[c.type];
    return { kind: "celebration", icon: tag.icon, label: tag.label, rank: overallRankFor("celebration", c.priority) };
  });

  const supportTags: CustomerSignalTag[] = (support?.reasons ?? []).map((r) => {
    const tag = SUPPORT_TAG[r.type];
    // Attention flags carry their own human label (e.g. "近期身体不适").
    const label = r.type === "attention_flag" ? r.text : tag.label;
    return { kind: "support", icon: tag.icon, label, rank: overallRankFor("support", r.priority) };
  });

  if (celebrationTags.length === 0 && supportTags.length === 0) return null;

  const journeyDay = support?.journeyDay ?? celebrations[0]?.journeyDay ?? (ctx.startDate ? calculateCurrentDay(ctx.startDate) : 1);
  const cappedDay = ctx.journeyDays ? Math.min(journeyDay, ctx.journeyDays) : journeyDay;
  const allRanks = [...celebrationTags, ...supportTags].map((t) => t.rank);
  const overallRank = Math.min(...allRanks);
  // The leading tag decides the accent — whichever the top rank belongs to.
  const overallTone: CustomerSignalTag["kind"] =
    supportTags.some((t) => t.rank === overallRank) && !celebrationTags.some((t) => t.rank === overallRank) ? "support" : "celebration";

  return {
    customerId: ctx.id,
    customerName: ctx.name,
    avatar: ctx.avatar,
    journeyName: journeyNameFor(ctx.journeyDays),
    journeyDay: cappedDay,
    celebrationTags,
    supportTags,
    overallRank,
    overallTone,
  };
}

/** Encouraging coaching statistics grouped by Journey state. Not a KPI, not a
 * ranking. A completed Journey is one whose elapsed days have reached its
 * duration; paused is a separate state (see deriveJourneyState). */
function computeImpact(contexts: CoachCustomerContext[], today = todayDateStr()): CoachImpact {
  const thisMonth = today.slice(0, 7);
  let activeJourney = 0;
  let journeysCompleted = 0;
  let journeysPaused = 0;
  let journeysCompletedThisMonth = 0;

  for (const ctx of contexts) {
    const state = deriveJourneyState(ctx);
    if (state === "paused") {
      journeysPaused += 1;
    } else if (state === "completed") {
      journeysCompleted += 1;
      const completedOn = new Date(toUtc(ctx.startDate!) + ctx.journeyDays! * 86400000).toISOString().slice(0, 10);
      if (completedOn.slice(0, 7) === thisMonth) journeysCompletedThisMonth += 1;
    } else {
      activeJourney += 1;
    }
  }

  return { totalCustomers: contexts.length, activeJourney, journeysCompleted, journeysPaused, journeysCompletedThisMonth };
}

// ---------- Orchestrator ----------

export async function getCoachWorkspace(coachId: string): Promise<CoachWorkspace> {
  const customers = await getMyCustomers(coachId);
  if (customers.length === 0) {
    return { celebrations: [], support: [], cards: [], impact: EMPTY_IMPACT, celebrateCustomerCount: 0, supportCustomerCount: 0 };
  }
  const ids = customers.map((c) => c.id);

  const [goalPlans, goals, checkIns, checkouts, transactions, inventory, bodyProgress, flags, alerts] = await Promise.all([
    getGoalPlansForCustomers(ids),
    getCustomerGoalsForCustomers(ids),
    getCheckInsForCustomers(ids),
    getCheckoutsForCustomers(ids, daysAgo(30), todayDateStr()),
    getTransactionsForCustomers(ids),
    getInventoryForCustomers(ids),
    getBodyProgressRecordsForCustomers(ids),
    getActiveAttentionFlagsForCustomers(ids),
    getActiveAlerts(),
  ]);

  const alertsByCustomer: Record<string, RepurchaseAlert[]> = {};
  for (const a of alerts) (alertsByCustomer[a.customerId] ??= []).push(a);

  const contexts: CoachCustomerContext[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    phone: c.phone,
    startDate: c.startDate,
    journeyDays: (goalPlans[c.id] as GoalPlan | undefined)?.journeyDays ?? null,
    goal: goals[c.id],
    checkIns: checkIns[c.id] ?? [],
    checkouts: checkouts[c.id] ?? [],
    transactions: transactions[c.id] ?? [],
    inventory: inventory[c.id] ?? [],
    bodyProgress: bodyProgress[c.id] ?? [],
    flags: flags[c.id] ?? [],
    repurchaseAlerts: alertsByCustomer[c.id] ?? [],
  }));

  // Celebration and support stay two independent dimensions at derivation
  // time; the Home then aggregates both into one card per customer so the
  // Coach decides to contact each person once.
  const celebrations: CelebrationItem[] = [];
  const support: SupportItem[] = [];
  const cards: CoachCustomerCard[] = [];

  for (const ctx of contexts) {
    // Paused Journeys leave the daily coaching workspace — they are still
    // counted in My Impact, just not surfaced for daily contact.
    if (deriveJourneyState(ctx) === "paused") continue;
    const cels = deriveCelebrations(ctx);
    const sup = deriveSupport(ctx);
    celebrations.push(...cels);
    if (sup) support.push(sup);
    const card = buildCustomerCard(ctx, cels, sup);
    if (card) cards.push(card);
  }

  celebrations.sort((a, b) => CELEBRATION_PRIORITY_ORDER[a.priority] - CELEBRATION_PRIORITY_ORDER[b.priority]);
  support.sort((a, b) => SUPPORT_PRIORITY_ORDER[a.priority] - SUPPORT_PRIORITY_ORDER[b.priority]);
  cards.sort((a, b) => a.overallRank - b.overallRank || a.customerName.localeCompare(b.customerName));

  const celebrateCustomerCount = new Set(celebrations.map((c) => c.customerId)).size;
  const supportCustomerCount = support.length;

  return {
    celebrations,
    support,
    cards,
    impact: computeImpact(contexts),
    celebrateCustomerCount,
    supportCustomerCount,
  };
}

function daysAgo(n: number): string {
  const d = new Date(toUtc(todayDateStr()) - n * 86400000);
  return d.toISOString().slice(0, 10);
}

/** Single-customer context for the Focus View — same derivation inputs as
 * the workspace, scoped to one customer (RLS still limits a Coach to their
 * own roster). */
export async function getCoachCustomerContext(customerId: string): Promise<CoachCustomerContext | undefined> {
  const profile = await getCustomerProfile(customerId);
  if (!profile) return undefined;
  const ids = [customerId];

  const [goalPlans, goals, checkIns, checkouts, transactions, inventory, bodyProgress, flags, alerts] = await Promise.all([
    getGoalPlansForCustomers(ids),
    getCustomerGoalsForCustomers(ids),
    getCheckInsForCustomers(ids),
    getCheckoutsForCustomers(ids, daysAgo(30), todayDateStr()),
    getTransactionsForCustomers(ids),
    getInventoryForCustomers(ids),
    getBodyProgressRecordsForCustomers(ids),
    getActiveAttentionFlagsForCustomers(ids),
    getActiveAlerts(),
  ]);

  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    phone: profile.phone,
    startDate: profile.startDate,
    journeyDays: (goalPlans[customerId] as GoalPlan | undefined)?.journeyDays ?? null,
    goal: goals[customerId],
    checkIns: checkIns[customerId] ?? [],
    checkouts: checkouts[customerId] ?? [],
    transactions: transactions[customerId] ?? [],
    inventory: inventory[customerId] ?? [],
    bodyProgress: bodyProgress[customerId] ?? [],
    flags: flags[customerId] ?? [],
    repurchaseAlerts: alerts.filter((a) => a.customerId === customerId),
  };
}
