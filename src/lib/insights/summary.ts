import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SpecialCondition } from "@/lib/checkout/types";
import { generateAttentionFlags } from "./rules";
import type {
  BowelMovementSummary,
  CustomerTrendSummary,
  DataQuality,
  HabitCompletionSummary,
  SpecialConditionCounts,
  WeightTrendSummary,
} from "./types";

/** Accepts either the browser client or a server (cookie-scoped) client —
 * both satisfy this shape, and every function here is just RLS-scoped reads
 * plus pure arithmetic, so it works identically from either call site. */
type Client = SupabaseClient<Database>;

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgoDateStr(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return dateStr(d);
}

function isConsecutiveDay(prevDate: string, currentDate: string): boolean {
  const prev = new Date(`${prevDate}T00:00:00Z`).getTime();
  const current = new Date(`${currentDate}T00:00:00Z`).getTime();
  return Math.round((current - prev) / 86400000) === 1;
}

export async function calculateWeightTrend(client: Client, customerId: string, startDate: string, endDate: string): Promise<WeightTrendSummary> {
  const { data, error } = await client
    .from("daily_checkins")
    .select("checkin_date, weight")
    .eq("customer_id", customerId)
    .gte("checkin_date", startDate)
    .lte("checkin_date", endDate)
    .order("checkin_date", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) {
    return { validEntries: 0, firstWeight: null, latestWeight: null, changeKg: null, trend: "insufficient" };
  }
  const firstWeight = Number(rows[0].weight);
  const latestWeight = Number(rows[rows.length - 1].weight);
  const changeKg = Math.round((latestWeight - firstWeight) * 10) / 10;
  let trend: WeightTrendSummary["trend"] = "stable";
  if (rows.length < 3) trend = "insufficient";
  else if (changeKg <= -0.5) trend = "down";
  else if (changeKg >= 0.5) trend = "up";
  return { validEntries: rows.length, firstWeight, latestWeight, changeKg, trend };
}

export async function calculateBowelMovementPattern(client: Client, customerId: string, startDate: string, endDate: string): Promise<BowelMovementSummary> {
  const { data, error } = await client
    .from("daily_evening_checkouts")
    .select("checkout_date, bowel_movement")
    .eq("customer_id", customerId)
    .gte("checkout_date", startDate)
    .lte("checkout_date", endDate)
    .order("checkout_date", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];

  let zeroDays = 0;
  let oneTimeDays = 0;
  let twoOrMoreDays = 0;
  let longestZeroStreak = 0;
  let currentZeroStreak = 0;
  let prevDate: string | null = null;

  for (const row of rows) {
    if (row.bowel_movement === "none") {
      zeroDays++;
      currentZeroStreak = prevDate && isConsecutiveDay(prevDate, row.checkout_date) ? currentZeroStreak + 1 : 1;
      longestZeroStreak = Math.max(longestZeroStreak, currentZeroStreak);
    } else {
      currentZeroStreak = 0;
      if (row.bowel_movement === "once") oneTimeDays++;
      else twoOrMoreDays++;
    }
    prevDate = row.checkout_date;
  }

  return { zeroDays, oneTimeDays, twoOrMoreDays, longestZeroStreak, loggedDays: rows.length };
}

export async function countSpecialConditions(
  client: Client,
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<{ counts: SpecialConditionCounts; notes: string[] }> {
  const { data, error } = await client
    .from("daily_evening_checkouts")
    .select("special_conditions, notes")
    .eq("customer_id", customerId)
    .gte("checkout_date", startDate)
    .lte("checkout_date", endDate);
  if (error) throw error;

  const counts: SpecialConditionCounts = { gathering: 0, eating_out: 0, period: 0, late_night: 0, sick: 0, stress: 0, travel: 0, other: 0 };
  const notes: string[] = [];
  for (const row of data ?? []) {
    for (const condition of (row.special_conditions ?? []) as SpecialCondition[]) {
      if (condition in counts) counts[condition]++;
    }
    if (row.notes && row.notes.trim()) notes.push(row.notes.trim());
  }
  return { counts, notes };
}

function calcSleepHours(bedtime: string, wakeTime: string): number | null {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) return null;
  let diffMinutes = wh * 60 + wm - (bh * 60 + bm);
  if (diffMinutes <= 0) diffMinutes += 24 * 60;
  return Math.round((diffMinutes / 60) * 10) / 10;
}

export async function calculateHabitCompletion(
  client: Client,
  customerId: string,
  startDate: string,
  endDate: string,
  waterTargetMl: number,
): Promise<HabitCompletionSummary> {
  const startOfRange = `${startDate}T00:00:00Z`;
  const endOfRange = `${endDate}T23:59:59Z`;

  const [waterRes, mealsRes, txRes, checkinRes] = await Promise.all([
    client.from("daily_water_logs").select("log_date, total_ml").eq("customer_id", customerId).gte("log_date", startDate).lte("log_date", endDate),
    client.from("meals").select("created_at").eq("customer_id", customerId).gte("created_at", startOfRange).lte("created_at", endOfRange),
    client
      .from("inventory_transactions")
      .select("product_code, quantity_change, type, created_at")
      .eq("customer_id", customerId)
      .in("type", ["MEAL_USAGE", "CHECK_IN_USAGE"])
      .gte("created_at", startOfRange)
      .lte("created_at", endOfRange),
    client.from("daily_checkins").select("checkin_date, bedtime, wake_time").eq("customer_id", customerId).gte("checkin_date", startDate).lte("checkin_date", endDate),
  ]);
  if (waterRes.error) throw waterRes.error;
  if (mealsRes.error) throw mealsRes.error;
  if (txRes.error) throw txRes.error;
  if (checkinRes.error) throw checkinRes.error;

  const waterTargetDays = (waterRes.data ?? []).filter((r) => r.total_ml >= waterTargetMl).length;
  const plate211Meals = (mealsRes.data ?? []).length;
  const foodCheckInDays = new Set((mealsRes.data ?? []).map((m) => m.created_at.slice(0, 10))).size;
  const misuNTotalSachets = (txRes.data ?? []).filter((t) => t.product_code === "MISU_N_PLUS").reduce((sum, t) => sum + Math.abs(t.quantity_change), 0);
  const misuDxTotalSachets = (txRes.data ?? []).filter((t) => t.product_code === "MISU_DX_PLUS").reduce((sum, t) => sum + Math.abs(t.quantity_change), 0);

  const sleepDurations = (checkinRes.data ?? [])
    .map((c) => calcSleepHours(c.bedtime, c.wake_time))
    .filter((h): h is number => h !== null);
  const avgSleepHours = sleepDurations.length > 0 ? Math.round((sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length) * 10) / 10 : null;

  return { waterTargetDays, plate211Meals, foodCheckInDays, misuNTotalSachets, misuDxTotalSachets, avgSleepHours };
}

export interface BuildTrendSummaryOptions {
  periodDays: 7 | 14;
  waterTargetMl: number;
}

/** The single entry point that assembles everything above into the
 * structured summary — this is what gets shown to a Coach and what gets
 * turned into the AI payload. Attention tags are always evaluated off the
 * fixed 7-day rule window regardless of periodDays ("最近7天" in every rule
 * in the spec), so a 14-day summary still carries the same 7-day tags. */
export async function buildCustomerTrendSummary(client: Client, customerId: string, options: BuildTrendSummaryOptions): Promise<CustomerTrendSummary> {
  const endDate = dateStr(new Date());
  const startDate = daysAgoDateStr(options.periodDays - 1);
  const flagWindowStart = daysAgoDateStr(6);

  const [weight, bowelMovement, conditionsResult, habits, flagBowelMovement] = await Promise.all([
    calculateWeightTrend(client, customerId, startDate, endDate),
    calculateBowelMovementPattern(client, customerId, startDate, endDate),
    countSpecialConditions(client, customerId, startDate, endDate),
    calculateHabitCompletion(client, customerId, startDate, endDate, options.waterTargetMl),
    options.periodDays === 7 ? Promise.resolve(null) : calculateBowelMovementPattern(client, customerId, flagWindowStart, endDate),
  ]);

  const dataQuality: DataQuality = weight.validEntries < 3 || bowelMovement.loggedDays < 3 || habits.foodCheckInDays < 3 ? "limited" : "sufficient";

  const summary: CustomerTrendSummary = {
    customerId,
    period: { startDate, endDate, days: options.periodDays },
    weight,
    bowelMovement,
    specialConditions: conditionsResult.counts,
    habits,
    notesSummary: conditionsResult.notes.slice(0, 5),
    attentionTags: [],
    dataQuality,
  };

  // Attention tags always reflect the trailing 7 days specifically, even
  // when this summary itself spans 14.
  const flagSummary = flagBowelMovement ? { ...summary, bowelMovement: flagBowelMovement } : summary;
  summary.attentionTags = generateAttentionFlags(flagSummary).map((f) => f.label);

  return summary;
}

/** Only this structured object ever reaches OpenAI — never raw rows
 * ("不要把整个数据库直接传给AI"). Snake_case keys match the spec's example
 * payload shape exactly. */
export function buildAIInsightPayload(summary: CustomerTrendSummary) {
  return {
    period: { start_date: summary.period.startDate, end_date: summary.period.endDate },
    weight: {
      valid_entries: summary.weight.validEntries,
      first_weight: summary.weight.firstWeight,
      latest_weight: summary.weight.latestWeight,
      change_kg: summary.weight.changeKg,
      trend: summary.weight.trend,
    },
    bowel_movement: {
      zero_days: summary.bowelMovement.zeroDays,
      one_time_days: summary.bowelMovement.oneTimeDays,
      two_or_more_days: summary.bowelMovement.twoOrMoreDays,
      longest_zero_streak: summary.bowelMovement.longestZeroStreak,
    },
    special_conditions: { ...summary.specialConditions },
    habits: {
      water_target_days: summary.habits.waterTargetDays,
      plate_211_meals: summary.habits.plate211Meals,
      food_check_in_days: summary.habits.foodCheckInDays,
      misu_n_total_sachets: summary.habits.misuNTotalSachets,
      misu_dx_total_sachets: summary.habits.misuDxTotalSachets,
      ...(summary.habits.avgSleepHours !== null ? { avg_sleep_hours: summary.habits.avgSleepHours } : {}),
    },
    notes_summary: summary.notesSummary,
    attention_tags: summary.attentionTags,
  };
}

/** Diffs the newly-computed flags against the currently-active ones and
 * syncs the difference — resolves what's no longer triggered, inserts
 * what's newly triggered, leaves the rest untouched. Cheap (no AI), so this
 * runs any time a summary is built: after a checkout submit, or whenever a
 * customer/coach/admin views one. */
export async function syncAttentionFlags(client: Client, customerId: string, summary: CustomerTrendSummary): Promise<void> {
  const newFlags = generateAttentionFlags(summary);
  const newTypes = new Set(newFlags.map((f) => f.flagType));

  const { data: existing, error } = await client.from("customer_attention_flags").select("id, flag_type").eq("customer_id", customerId).eq("is_active", true);
  if (error) throw error;

  const existingTypes = new Set((existing ?? []).map((f) => f.flag_type));

  const toResolve = (existing ?? []).filter((f) => !newTypes.has(f.flag_type)).map((f) => f.id);
  if (toResolve.length > 0) {
    await client.from("customer_attention_flags").update({ is_active: false, resolved_at: new Date().toISOString() }).in("id", toResolve);
  }

  const toInsert = newFlags.filter((f) => !existingTypes.has(f.flagType));
  if (toInsert.length > 0) {
    await client.from("customer_attention_flags").insert(
      toInsert.map((f) => ({
        customer_id: customerId,
        flag_type: f.flagType,
        flag_label: f.label,
        severity: f.severity,
        source_start_date: summary.period.startDate,
        source_end_date: summary.period.endDate,
        is_active: true,
      })),
    );
  }
}
