"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { MealEntry, MealMisuItem, MealFoodItem } from "@/lib/types";
import type {
  CustomerInventory,
  DailyCheckIn,
  EngineResult,
  InventoryTransaction,
  ProductCode,
  RepurchaseAlert,
} from "./types";

const CHANGE_EVENT = "misu-inventory-change";

/** Fired after any successful write so hooks.ts can refetch affected data. */
export function notifyInventoryChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeInventory(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

/** Local calendar date (device timezone), not UTC — "today" for a Malaysia
 * customer at 11pm must not roll over to tomorrow just because it's already
 * past midnight UTC. */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The Journey Day rolls over at 04:00 local, not midnight — 00:00-03:59
 * still belongs to the day that's just ending, matching customer_journey_date()
 * server-side (also 4h-shifted off profiles.timezone). Every caller of
 * todayDateStr()/yesterdayDateStr() in this app already means "today's Journey
 * Day", not the literal calendar date, so the shift is applied here once
 * rather than at each call site. */
const JOURNEY_DAY_START_HOUR = 4;

function journeyShiftedDate(): Date {
  const d = new Date();
  if (d.getHours() < JOURNEY_DAY_START_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function todayDateStr(): string {
  return localDateStr(journeyShiftedDate());
}

export function yesterdayDateStr(): string {
  const d = journeyShiftedDate();
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}

// ---------- Row <-> domain type mappers ----------

type InventoryRow = Database["public"]["Tables"]["customer_inventory"]["Row"];
type TransactionRow = Database["public"]["Tables"]["inventory_transactions"]["Row"];
type CheckInRow = Database["public"]["Tables"]["daily_checkins"]["Row"];
type AlertRow = Database["public"]["Tables"]["repurchase_alerts"]["Row"];
type MealRow = Database["public"]["Tables"]["meals"]["Row"];

function mapInventoryRow(row: InventoryRow): CustomerInventory {
  return {
    id: row.id,
    customerId: row.customer_id,
    productCode: row.product_code,
    boxesPurchased: row.boxes_purchased,
    unitsPerBox: row.units_per_box,
    initialUnits: row.initial_units,
    totalAddedUnits: row.total_added_units,
    totalUsedUnits: row.total_used_units,
    remainingUnits: row.remaining_units,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransactionRow(row: TransactionRow): InventoryTransaction {
  return {
    id: row.id,
    customerId: row.customer_id,
    productCode: row.product_code,
    type: row.type,
    quantityChange: row.quantity_change,
    balanceAfter: row.balance_after,
    relatedRecordId: row.related_record_id ?? undefined,
    note: row.note ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapCheckInRow(row: CheckInRow): DailyCheckIn {
  return {
    id: row.id,
    customerId: row.customer_id,
    date: row.checkin_date,
    weight: Number(row.weight),
    poopCount: row.poop_count,
    bedtime: row.bedtime,
    wakeTime: row.wake_time,
    sleepStartAt: row.sleep_start_at,
    sleepEndAt: row.sleep_end_at,
    sleepDurationMinutes: row.sleep_duration_minutes,
    productUsage: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAlertRow(row: AlertRow): RepurchaseAlert {
  return {
    id: row.id,
    customerId: row.customer_id,
    productCode: row.product_code,
    status: row.status,
    alertLevel: row.alert_level,
    remainingUnitsWhenTriggered: row.remaining_units_when_triggered,
    triggeredAt: row.triggered_at,
    followedUpAt: row.followed_up_at ?? undefined,
    followedUpBy: row.followed_up_by ?? undefined,
    completedAt: row.completed_at ?? undefined,
    note: row.note ?? undefined,
  };
}

function mapMealRow(row: MealRow): MealEntry {
  return {
    id: row.id,
    type: row.meal_type as MealEntry["type"],
    misuItems: (row.misu_items as unknown as MealMisuItem[]) ?? [],
    foodItems: (row.food_items as unknown as MealFoodItem[]) ?? [],
    name: row.name,
    time: row.meal_time,
    photoEmoji: row.photo_emoji ?? "",
    portion: row.portion ?? "",
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    fiber: Number(row.fiber),
    misuScore: Number(row.misu_score),
    goodPoints: row.good_points,
    improvePoints: row.improve_points,
    aiAdvice: row.ai_advice ?? "",
  };
}

function rpcErrorMessage(error: { message: string }): string {
  return error.message;
}

// ---------- Read accessors ----------

export async function getCustomerInventoryList(customerId: string): Promise<CustomerInventory[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("customer_inventory").select("*").eq("customer_id", customerId);
  if (error) throw error;
  return (data ?? []).map(mapInventoryRow);
}

export async function hasInventoryRecords(customerId: string): Promise<boolean> {
  const rows = await getCustomerInventoryList(customerId);
  return rows.length > 0;
}

export async function getTransactionsForCustomer(customerId: string): Promise<InventoryTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTransactionRow);
}

export async function getCheckInsForCustomer(customerId: string): Promise<DailyCheckIn[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("customer_id", customerId)
    .order("checkin_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCheckInRow);
}

/** Batched lookup for a Coach's customer roster (one query instead of N),
 * grouped by customer id — the async replacement for the old
 * useAllInventory()/useAllCheckIns() localStorage-map hooks. */
export async function getInventoryForCustomers(customerIds: string[]): Promise<Record<string, CustomerInventory[]>> {
  if (customerIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase.from("customer_inventory").select("*").in("customer_id", customerIds);
  if (error) throw error;
  const map: Record<string, CustomerInventory[]> = {};
  for (const row of (data ?? []).map(mapInventoryRow)) {
    (map[row.customerId] ??= []).push(row);
  }
  return map;
}

export async function getCheckInsForCustomers(customerIds: string[]): Promise<Record<string, DailyCheckIn[]>> {
  if (customerIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase.from("daily_checkins").select("*").in("customer_id", customerIds);
  if (error) throw error;
  const map: Record<string, DailyCheckIn[]> = {};
  for (const row of (data ?? []).map(mapCheckInRow)) {
    (map[row.customerId] ??= []).push(row);
  }
  return map;
}

export async function getTransactionsForCustomers(customerIds: string[]): Promise<Record<string, InventoryTransaction[]>> {
  if (customerIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase.from("inventory_transactions").select("*").in("customer_id", customerIds);
  if (error) throw error;
  const map: Record<string, InventoryTransaction[]> = {};
  for (const row of (data ?? []).map(mapTransactionRow)) {
    (map[row.customerId] ??= []).push(row);
  }
  return map;
}

async function getCheckInForDate(customerId: string, date: string): Promise<DailyCheckIn | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("customer_id", customerId)
    .eq("checkin_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCheckInRow(data) : undefined;
}

export async function getTodayCheckIn(customerId: string): Promise<DailyCheckIn | undefined> {
  return getCheckInForDate(customerId, todayDateStr());
}

export async function getAlertsForCustomer(customerId: string): Promise<RepurchaseAlert[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("repurchase_alerts").select("*").eq("customer_id", customerId);
  if (error) throw error;
  return (data ?? []).map(mapAlertRow);
}

export async function getActiveAlerts(): Promise<RepurchaseAlert[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("repurchase_alerts").select("*").in("status", ["OPEN", "FOLLOWED_UP"]);
  if (error) throw error;
  return (data ?? []).map(mapAlertRow);
}

export async function getTodayMeals(customerId: string): Promise<MealEntry[]> {
  const supabase = createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("customer_id", customerId)
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMealRow);
}

/** Batched lookup for a Coach's customer roster — same pattern as
 * getCheckInsForCustomers. */
export async function getTodayMealsForCustomers(customerIds: string[]): Promise<Record<string, MealEntry[]>> {
  if (customerIds.length === 0) return {};
  const supabase = createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .in("customer_id", customerIds)
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  const map: Record<string, MealEntry[]> = {};
  for (const row of data ?? []) {
    (map[row.customer_id] ??= []).push(mapMealRow(row));
  }
  return map;
}

/** Usage-driven daily average across the last N days, from an already-fetched
 * transaction list (callers load transactions once and share them). */
export function calcAverageDailyUsage(transactions: InventoryTransaction[], productCode: ProductCode, daysWindow = 7): number | null {
  const cutoff = Date.now() - daysWindow * 24 * 60 * 60 * 1000;
  const usageTx = transactions.filter(
    (t) =>
      t.productCode === productCode &&
      (t.type === "CHECK_IN_USAGE" || t.type === "MEAL_USAGE") &&
      new Date(t.createdAt).getTime() >= cutoff,
  );
  if (usageTx.length === 0) return null;
  const totalUsed = usageTx.reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);
  const recordedDays = new Set(usageTx.map((t) => t.createdAt.slice(0, 10))).size;
  if (recordedDays === 0) return null;
  return totalUsed / recordedDays;
}

export function calcEstimatedDaysRemaining(remainingUnits: number, avgDailyUsage: number | null): number | null {
  if (avgDailyUsage === null || avgDailyUsage <= 0) return null;
  return Math.round(remainingUnits / avgDailyUsage);
}

// ---------- Write operations ----------
// All inventory-mutating writes go through SECURITY DEFINER Postgres RPCs so
// idempotency, insufficient-stock guards, and alert transitions are enforced
// atomically in the database (see supabase/migrations), not the client.

export async function initializeInventoryFromRegistration(
  customerId: string,
  boxesPurchased: Partial<Record<ProductCode, number>>,
): Promise<EngineResult> {
  const boxesN = boxesPurchased.MISU_N_PLUS ?? 0;
  const boxesDX = boxesPurchased.MISU_DX_PLUS ?? 0;
  if (!Number.isInteger(boxesN) || boxesN < 0 || !Number.isInteger(boxesDX) || boxesDX < 0) {
    return { ok: false, error: "购买盒数只能是 0 或正整数" };
  }
  if (boxesN <= 0 && boxesDX <= 0) {
    return { ok: false, error: "至少一项产品的购买盒数必须大于 0" };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("init_customer_inventory", {
    p_customer_id: customerId,
    p_boxes_n_plus: boxesN,
    p_boxes_dx_plus: boxesDX,
  });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  notifyInventoryChange();
  return { ok: true };
}

export async function initializeLegacyBalance(
  customerId: string,
  remaining: Partial<Record<ProductCode, number>>,
): Promise<EngineResult> {
  const n = remaining.MISU_N_PLUS ?? 0;
  const dx = remaining.MISU_DX_PLUS ?? 0;
  if (!Number.isInteger(n) || n < 0 || !Number.isInteger(dx) || dx < 0) {
    return { ok: false, error: "剩余包数只能是 0 或正整数" };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("init_legacy_balance", {
    p_customer_id: customerId,
    p_remaining_n_plus: n,
    p_remaining_dx_plus: dx,
  });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  notifyInventoryChange();
  return { ok: true };
}

export interface SubmitCheckInInput {
  id: string;
  customerId: string;
  date: string;
  weight: number;
  bedtime: string;
  wakeTime: string;
}

/** Goes through record_morning_checkin() rather than a plain insert: this is
 * the one action that starts the customer's Journey Day (creates/activates
 * their daily_journeys row in the same transaction as the checkin row).
 * Bowel movement is no longer part of this payload — it belongs to the
 * evening checkout (daily_evening_checkouts), not the morning weigh-in;
 * the RPC itself now stores null for poop_count on every new row. */
export async function submitCheckIn(input: SubmitCheckInInput): Promise<EngineResult<DailyCheckIn>> {
  const supabase = createClient();
  const { error } = await supabase.rpc("record_morning_checkin", {
    p_checkin_id: input.id,
    p_customer_id: input.customerId,
    p_date: input.date,
    p_weight: input.weight,
    p_bedtime: input.bedtime,
    p_wake_time: input.wakeTime,
  });

  if (error) return { ok: false, error: error.message };

  const record = await getCheckInForDate(input.customerId, input.date);
  if (!record) return { ok: false, error: "打卡失败，请重试" };
  notifyInventoryChange();
  return { ok: true, data: record };
}

export interface EditCheckInInput {
  date: string;
  weight: number;
  bedtime: string;
  wakeTime: string;
}

/** Mirrors record_morning_checkin()'s cross-midnight sleep math: bedtime is
 * "last night" unless it's numerically before wake time (both after
 * midnight), in which case it's the same calendar day as wake. */
function computeSleepFields(dateStr: string, bedtime: string, wakeTime: string): { sleepStartAt: string; sleepEndAt: string; sleepDurationMinutes: number } {
  const wakeAt = new Date(`${dateStr}T${wakeTime}:00`);
  const bedDate = new Date(`${dateStr}T00:00:00`);
  if (bedtime >= wakeTime) bedDate.setDate(bedDate.getDate() - 1);
  const bedAt = new Date(`${localDateStr(bedDate)}T${bedtime}:00`);
  const sleepDurationMinutes = Math.round((wakeAt.getTime() - bedAt.getTime()) / 60000);
  return { sleepStartAt: bedAt.toISOString(), sleepEndAt: wakeAt.toISOString(), sleepDurationMinutes };
}

/** Plain table update (not the RPC) — only ever used to edit today's own
 * already-recorded check-in, never poop_count (that field is only ever
 * written, as null, by record_morning_checkin() now). */
export async function editCheckIn(customerId: string, checkInId: string, updates: EditCheckInInput): Promise<EngineResult> {
  const supabase = createClient();
  const sleep = computeSleepFields(updates.date, updates.bedtime, updates.wakeTime);
  const { error } = await supabase
    .from("daily_checkins")
    .update({
      weight: updates.weight,
      bedtime: updates.bedtime,
      wake_time: updates.wakeTime,
      sleep_start_at: sleep.sleepStartAt,
      sleep_end_at: sleep.sleepEndAt,
      sleep_duration_minutes: sleep.sleepDurationMinutes,
    })
    .eq("id", checkInId)
    .eq("customer_id", customerId);
  if (error) return { ok: false, error: error.message };
  notifyInventoryChange();
  return { ok: true };
}

export async function deleteCheckIn(customerId: string, checkInId: string): Promise<EngineResult> {
  const supabase = createClient();
  const { error } = await supabase.from("daily_checkins").delete().eq("id", checkInId).eq("customer_id", customerId);
  if (error) return { ok: false, error: error.message };
  notifyInventoryChange();
  return { ok: true };
}

export interface RecordMealInput {
  mealId: string;
  customerId: string;
  mealType: MealEntry["type"];
  misuItems: MealMisuItem[];
  foodItems: MealFoodItem[];
  name: string;
  mealTime: string;
  photoEmoji?: string;
  portion?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  misuScore: number;
  goodPoints: string[];
  improvePoints: string[];
  aiAdvice?: string;
}

/** Deducts MISU stock (with a row-level lock + sufficiency check) and saves
 * the meal record in one database transaction. Idempotent by mealId — a
 * repeat call (double-click on "完成记录", retried request) is a safe no-op. */
export async function recordMeal(input: RecordMealInput): Promise<EngineResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("record_meal", {
    p_meal_id: input.mealId,
    p_customer_id: input.customerId,
    p_meal_type: input.mealType,
    p_misu_items: input.misuItems as never,
    p_food_items: input.foodItems as never,
    p_name: input.name,
    p_meal_time: input.mealTime,
    p_photo_emoji: input.photoEmoji ?? "",
    p_portion: input.portion ?? "",
    p_calories: input.calories,
    p_protein: input.protein,
    p_carbs: input.carbs,
    p_fat: input.fat,
    p_fiber: input.fiber,
    p_misu_score: input.misuScore,
    p_good_points: input.goodPoints,
    p_improve_points: input.improvePoints,
    p_ai_advice: input.aiAdvice ?? "",
  });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  notifyInventoryChange();
  return { ok: true };
}

export async function recordRepurchase(
  customerId: string,
  productCode: ProductCode,
  boxes: number,
  date: string | undefined,
  note: string | undefined,
): Promise<EngineResult> {
  if (!Number.isInteger(boxes) || boxes <= 0) {
    return { ok: false, error: "回购盒数必须是大于 0 的整数" };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("record_repurchase", {
    p_customer_id: customerId,
    p_product_code: productCode,
    p_boxes: boxes,
    p_date: date ?? todayDateStr(),
    p_note: note ?? "",
  });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  notifyInventoryChange();
  return { ok: true };
}

export async function manualAdjustment(customerId: string, productCode: ProductCode, delta: number, reason: string): Promise<EngineResult> {
  if (!reason || !reason.trim()) {
    return { ok: false, error: "调整原因为必填" };
  }
  if (!Number.isInteger(delta) || delta === 0) {
    return { ok: false, error: "调整数量必须是不为 0 的整数" };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("manual_adjustment", {
    p_customer_id: customerId,
    p_product_code: productCode,
    p_delta: delta,
    p_reason: reason,
  });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  notifyInventoryChange();
  return { ok: true };
}

export async function markAlertFollowedUp(alertId: string): Promise<EngineResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_alert_followed_up", { p_alert_id: alertId });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  notifyInventoryChange();
  return { ok: true };
}
