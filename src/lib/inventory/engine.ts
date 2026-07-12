"use client";

import { UNITS_PER_BOX, PRODUCT_LABELS, getInventoryAlertStatus } from "./constants";
import {
  getInventoryMap,
  setInventoryMap,
  getTransactionMap,
  setTransactionMap,
  getCheckInMap,
  setCheckInMap,
  getAlerts,
  setAlerts,
  notifyInventoryChange,
  type TransactionMap,
} from "./storage";
import type {
  CustomerInventory,
  DailyCheckIn,
  EngineResult,
  InventoryTransaction,
  PoopCount,
  ProductCode,
  ProductUsageEntry,
  RepurchaseAlert,
  RepurchaseAlertLevel,
} from "./types";

function genId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function pushTransaction(txMap: TransactionMap, customerId: string, tx: InventoryTransaction) {
  const list = txMap[customerId] ?? [];
  list.push(tx);
  txMap[customerId] = list;
}

function findOrCreateRow(rows: CustomerInventory[], customerId: string, productCode: ProductCode): CustomerInventory {
  let row = rows.find((r) => r.productCode === productCode);
  if (!row) {
    row = {
      id: genId("inv"),
      customerId,
      productCode,
      boxesPurchased: 0,
      unitsPerBox: UNITS_PER_BOX,
      initialUnits: 0,
      totalAddedUnits: 0,
      totalUsedUnits: 0,
      remainingUnits: 0,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    rows.push(row);
  }
  return row;
}

/** Creates a new OPEN alert, upgrades/downgrades an existing OPEN/FOLLOWED_UP alert's level in
 * place, or auto-completes it once stock recovers to SUFFICIENT. Never creates a duplicate. */
function checkAndUpdateAlerts(alerts: RepurchaseAlert[], customerId: string, productCode: ProductCode, remainingUnits: number) {
  const status = getInventoryAlertStatus(productCode, remainingUnits);
  const activeIdx = alerts.findIndex(
    (a) => a.customerId === customerId && a.productCode === productCode && (a.status === "OPEN" || a.status === "FOLLOWED_UP"),
  );

  if (status === "SUFFICIENT") {
    if (activeIdx >= 0) {
      alerts[activeIdx] = { ...alerts[activeIdx], status: "COMPLETED", completedAt: nowISO() };
    }
    return;
  }

  const alertLevel = status as RepurchaseAlertLevel;
  if (activeIdx >= 0) {
    alerts[activeIdx] = { ...alerts[activeIdx], alertLevel, remainingUnitsWhenTriggered: remainingUnits };
    return;
  }

  alerts.push({
    id: genId("alert"),
    customerId,
    productCode,
    status: "OPEN",
    alertLevel,
    remainingUnitsWhenTriggered: remainingUnits,
    triggeredAt: nowISO(),
  });
}

/** A repurchase is an explicit resolving action: any open alert for this product is closed,
 * regardless of exact resulting level. It will re-trigger fresh from future usage if needed. */
function completeAlertsForRepurchase(alerts: RepurchaseAlert[], customerId: string, productCode: ProductCode) {
  for (let i = 0; i < alerts.length; i++) {
    const a = alerts[i];
    if (a.customerId === customerId && a.productCode === productCode && (a.status === "OPEN" || a.status === "FOLLOWED_UP")) {
      alerts[i] = { ...a, status: "COMPLETED", completedAt: nowISO() };
    }
  }
}

// ---------- Read accessors ----------

export function hasInventoryRecords(customerId: string): boolean {
  const map = getInventoryMap();
  return Boolean(map[customerId] && map[customerId].length > 0);
}

export function getCustomerInventoryList(customerId: string): CustomerInventory[] {
  return getInventoryMap()[customerId] ?? [];
}

export function getTransactionsForCustomer(customerId: string): InventoryTransaction[] {
  return getTransactionMap()[customerId] ?? [];
}

export function getCheckInsForCustomer(customerId: string): DailyCheckIn[] {
  return getCheckInMap()[customerId] ?? [];
}

export function getTodayCheckIn(customerId: string): DailyCheckIn | undefined {
  const today = todayDateStr();
  return getCheckInsForCustomer(customerId).find((c) => c.date === today);
}

export function getAlertsForCustomer(customerId: string): RepurchaseAlert[] {
  return getAlerts().filter((a) => a.customerId === customerId);
}

export function getActiveAlerts(): RepurchaseAlert[] {
  return getAlerts().filter((a) => a.status === "OPEN" || a.status === "FOLLOWED_UP");
}

export function calcAverageDailyUsage(customerId: string, productCode: ProductCode, daysWindow = 7): number | null {
  const list = getTransactionsForCustomer(customerId);
  const cutoff = Date.now() - daysWindow * 24 * 60 * 60 * 1000;
  const usageTx = list.filter(
    (t) => t.productCode === productCode && t.type === "CHECK_IN_USAGE" && new Date(t.createdAt).getTime() >= cutoff,
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

export function initializeInventoryFromRegistration(
  customerId: string,
  boxesPurchased: Partial<Record<ProductCode, number>>,
  createdBy: string,
): EngineResult {
  const entries = (Object.entries(boxesPurchased) as [ProductCode, number][]).filter(([, boxes]) => boxes !== undefined);

  for (const [, boxes] of entries) {
    if (!Number.isInteger(boxes) || boxes < 0) {
      return { ok: false, error: "购买盒数只能是 0 或正整数" };
    }
  }
  if (entries.every(([, boxes]) => boxes <= 0)) {
    return { ok: false, error: "至少一项产品的购买盒数必须大于 0" };
  }

  const inventoryMap = getInventoryMap();
  const txMap = getTransactionMap();

  const rows: CustomerInventory[] = [];
  for (const [productCode, boxes] of entries) {
    if (boxes <= 0) continue;
    const units = boxes * UNITS_PER_BOX;
    rows.push({
      id: genId("inv"),
      customerId,
      productCode,
      boxesPurchased: boxes,
      unitsPerBox: UNITS_PER_BOX,
      initialUnits: units,
      totalAddedUnits: units,
      totalUsedUnits: 0,
      remainingUnits: units,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
    pushTransaction(txMap, customerId, {
      id: genId("tx"),
      customerId,
      productCode,
      type: "INITIAL_PURCHASE",
      quantityChange: units,
      balanceAfter: units,
      createdBy,
      createdAt: nowISO(),
    });
  }

  inventoryMap[customerId] = rows;
  setInventoryMap(inventoryMap);
  setTransactionMap(txMap);
  notifyInventoryChange();
  return { ok: true };
}

export function initializeLegacyBalance(
  customerId: string,
  remaining: Partial<Record<ProductCode, number>>,
  createdBy: string,
): EngineResult {
  const entries = (Object.entries(remaining) as [ProductCode, number][]).filter(([, units]) => units !== undefined);
  for (const [, units] of entries) {
    if (!Number.isInteger(units) || units < 0) {
      return { ok: false, error: "剩余包数只能是 0 或正整数" };
    }
  }

  const inventoryMap = getInventoryMap();
  const txMap = getTransactionMap();
  const alerts = getAlerts();

  const rows: CustomerInventory[] = [];
  for (const [productCode, units] of entries) {
    rows.push({
      id: genId("inv"),
      customerId,
      productCode,
      boxesPurchased: 0,
      unitsPerBox: UNITS_PER_BOX,
      initialUnits: units,
      totalAddedUnits: units,
      totalUsedUnits: 0,
      remainingUnits: units,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
    pushTransaction(txMap, customerId, {
      id: genId("tx"),
      customerId,
      productCode,
      type: "MANUAL_INITIAL_BALANCE",
      quantityChange: units,
      balanceAfter: units,
      note: "旧顾客首次补登目前剩余库存",
      createdBy,
      createdAt: nowISO(),
    });
    checkAndUpdateAlerts(alerts, customerId, productCode, units);
  }

  inventoryMap[customerId] = rows;
  setInventoryMap(inventoryMap);
  setTransactionMap(txMap);
  setAlerts(alerts);
  notifyInventoryChange();
  return { ok: true };
}

export interface SubmitCheckInInput {
  id: string;
  customerId: string;
  date: string;
  weight: number;
  poopCount: PoopCount;
  bedtime: string;
  wakeTime: string;
  usage: ProductUsageEntry[];
  createdBy: string;
}

export function submitCheckIn(input: SubmitCheckInInput): EngineResult<DailyCheckIn> {
  const checkInMap = getCheckInMap();
  const existingList = checkInMap[input.customerId] ?? [];

  // Idempotency: the same checkInId can only ever be recorded once, even if
  // this function is invoked again (double click, retried submit, etc).
  const already = existingList.find((c) => c.id === input.id);
  if (already) {
    return { ok: true, data: already };
  }

  for (const u of input.usage) {
    if (!Number.isInteger(u.quantity) || u.quantity < 0) {
      return { ok: false, error: "使用数量只能是 0 或正整数" };
    }
  }

  const inventoryMap = getInventoryMap();
  const rows = inventoryMap[input.customerId] ?? [];

  for (const u of input.usage) {
    if (u.quantity <= 0) continue;
    const remaining = rows.find((r) => r.productCode === u.productCode)?.remainingUnits ?? 0;
    if (u.quantity > remaining) {
      return {
        ok: false,
        error: `你的${PRODUCT_LABELS[u.productCode]}目前只剩${remaining}包，无法记录使用${u.quantity}包，请检查数量或先更新回购库存。`,
      };
    }
  }

  const txMap = getTransactionMap();
  const alerts = getAlerts();

  for (const u of input.usage) {
    if (u.quantity <= 0) continue;
    const row = findOrCreateRow(rows, input.customerId, u.productCode);
    row.totalUsedUnits += u.quantity;
    row.remainingUnits -= u.quantity;
    row.updatedAt = nowISO();

    pushTransaction(txMap, input.customerId, {
      id: genId("tx"),
      customerId: input.customerId,
      productCode: u.productCode,
      type: "CHECK_IN_USAGE",
      quantityChange: -u.quantity,
      balanceAfter: row.remainingUnits,
      relatedCheckInId: input.id,
      createdBy: input.createdBy,
      createdAt: nowISO(),
    });

    checkAndUpdateAlerts(alerts, input.customerId, u.productCode, row.remainingUnits);
  }

  inventoryMap[input.customerId] = rows;
  setInventoryMap(inventoryMap);
  setTransactionMap(txMap);
  setAlerts(alerts);

  const checkIn: DailyCheckIn = {
    id: input.id,
    customerId: input.customerId,
    date: input.date,
    weight: input.weight,
    poopCount: input.poopCount,
    bedtime: input.bedtime,
    wakeTime: input.wakeTime,
    productUsage: input.usage.filter((u) => u.quantity > 0),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  checkInMap[input.customerId] = [...existingList, checkIn];
  setCheckInMap(checkInMap);

  notifyInventoryChange();
  return { ok: true, data: checkIn };
}

export interface MealMisuUsageInput {
  mealId: string;
  customerId: string;
  misuItems: { productCode: ProductCode; quantity: number }[];
  createdBy: string;
}

/** Deducts MISU stock for a confirmed Smart Meal Check record. Idempotent by
 * mealId, same pattern as submitCheckIn — a repeat call (double-click on
 * "完成记录", retried request) is a safe no-op. */
export function recordMealMisuUsage(input: MealMisuUsageInput): EngineResult {
  const txMap = getTransactionMap();
  const existingList = txMap[input.customerId] ?? [];
  const alreadyRecorded = existingList.some((t) => t.relatedCheckInId === input.mealId && t.type === "MEAL_USAGE");
  if (alreadyRecorded) {
    return { ok: true };
  }

  const items = input.misuItems.filter((m) => m.quantity > 0);
  if (items.length === 0) {
    return { ok: true };
  }

  for (const u of items) {
    if (!Number.isInteger(u.quantity) || u.quantity < 0) {
      return { ok: false, error: "使用数量只能是 0 或正整数" };
    }
  }

  const inventoryMap = getInventoryMap();
  const rows = inventoryMap[input.customerId] ?? [];

  for (const item of items) {
    const remaining = rows.find((r) => r.productCode === item.productCode)?.remainingUnits ?? 0;
    if (item.quantity > remaining) {
      return {
        ok: false,
        error: `你的${PRODUCT_LABELS[item.productCode]}目前只剩${remaining}包，无法记录使用${item.quantity}包，请检查数量或先更新回购库存。`,
      };
    }
  }

  const alerts = getAlerts();

  for (const item of items) {
    const row = findOrCreateRow(rows, input.customerId, item.productCode);
    row.totalUsedUnits += item.quantity;
    row.remainingUnits -= item.quantity;
    row.updatedAt = nowISO();

    pushTransaction(txMap, input.customerId, {
      id: genId("tx"),
      customerId: input.customerId,
      productCode: item.productCode,
      type: "MEAL_USAGE",
      quantityChange: -item.quantity,
      balanceAfter: row.remainingUnits,
      relatedCheckInId: input.mealId,
      note: "Smart Meal Check 记录使用",
      createdBy: input.createdBy,
      createdAt: nowISO(),
    });

    checkAndUpdateAlerts(alerts, input.customerId, item.productCode, row.remainingUnits);
  }

  inventoryMap[input.customerId] = rows;
  setInventoryMap(inventoryMap);
  setTransactionMap(txMap);
  setAlerts(alerts);
  notifyInventoryChange();
  return { ok: true };
}

export interface EditCheckInInput {
  weight: number;
  poopCount: PoopCount;
  bedtime: string;
  wakeTime: string;
  usage: ProductUsageEntry[];
}

export function editCheckIn(customerId: string, checkInId: string, updates: EditCheckInInput, editedBy: string): EngineResult {
  const checkInMap = getCheckInMap();
  const list = checkInMap[customerId] ?? [];
  const idx = list.findIndex((c) => c.id === checkInId);
  if (idx === -1) return { ok: false, error: "找不到这笔打卡记录" };
  const existing = list[idx];

  for (const u of updates.usage) {
    if (!Number.isInteger(u.quantity) || u.quantity < 0) {
      return { ok: false, error: "使用数量只能是 0 或正整数" };
    }
  }

  const inventoryMap = getInventoryMap();
  const rows = inventoryMap[customerId] ?? [];

  const productCodes = new Set<ProductCode>([
    ...existing.productUsage.map((u) => u.productCode),
    ...updates.usage.map((u) => u.productCode),
  ]);

  const diffs: { productCode: ProductCode; oldQty: number; newQty: number; diff: number }[] = [];
  for (const productCode of productCodes) {
    const oldQty = existing.productUsage.find((u) => u.productCode === productCode)?.quantity ?? 0;
    const newQty = updates.usage.find((u) => u.productCode === productCode)?.quantity ?? 0;
    const diff = newQty - oldQty;
    if (diff !== 0) diffs.push({ productCode, oldQty, newQty, diff });
  }

  for (const d of diffs) {
    if (d.diff > 0) {
      const remaining = rows.find((r) => r.productCode === d.productCode)?.remainingUnits ?? 0;
      if (d.diff > remaining) {
        return {
          ok: false,
          error: `你的${PRODUCT_LABELS[d.productCode]}目前只剩${remaining}包，无法将使用数量调整为${d.newQty}包，请检查数量或先更新回购库存。`,
        };
      }
    }
  }

  const txMap = getTransactionMap();
  const alerts = getAlerts();

  for (const d of diffs) {
    const row = findOrCreateRow(rows, customerId, d.productCode);
    row.totalUsedUnits += d.diff;
    row.remainingUnits -= d.diff;
    row.updatedAt = nowISO();

    pushTransaction(txMap, customerId, {
      id: genId("tx"),
      customerId,
      productCode: d.productCode,
      type: "CHECK_IN_EDIT",
      quantityChange: -d.diff,
      balanceAfter: row.remainingUnits,
      relatedCheckInId: checkInId,
      note: `编辑打卡：使用数量由 ${d.oldQty} 包调整为 ${d.newQty} 包`,
      createdBy: editedBy,
      createdAt: nowISO(),
    });

    checkAndUpdateAlerts(alerts, customerId, d.productCode, row.remainingUnits);
  }

  inventoryMap[customerId] = rows;
  setInventoryMap(inventoryMap);
  setTransactionMap(txMap);
  setAlerts(alerts);

  list[idx] = {
    ...existing,
    weight: updates.weight,
    poopCount: updates.poopCount,
    bedtime: updates.bedtime,
    wakeTime: updates.wakeTime,
    productUsage: updates.usage.filter((u) => u.quantity > 0),
    updatedAt: nowISO(),
  };
  checkInMap[customerId] = list;
  setCheckInMap(checkInMap);

  notifyInventoryChange();
  return { ok: true };
}

export function deleteCheckIn(customerId: string, checkInId: string, deletedBy: string): EngineResult {
  const checkInMap = getCheckInMap();
  const list = checkInMap[customerId] ?? [];
  const idx = list.findIndex((c) => c.id === checkInId);
  if (idx === -1) return { ok: false, error: "找不到这笔打卡记录" };
  const existing = list[idx];

  const inventoryMap = getInventoryMap();
  const rows = inventoryMap[customerId] ?? [];
  const txMap = getTransactionMap();
  const alerts = getAlerts();

  for (const u of existing.productUsage) {
    if (u.quantity <= 0) continue;
    const row = findOrCreateRow(rows, customerId, u.productCode);
    row.totalUsedUnits -= u.quantity;
    row.remainingUnits += u.quantity;
    row.updatedAt = nowISO();

    pushTransaction(txMap, customerId, {
      id: genId("tx"),
      customerId,
      productCode: u.productCode,
      type: "CHECK_IN_DELETE",
      quantityChange: u.quantity,
      balanceAfter: row.remainingUnits,
      relatedCheckInId: checkInId,
      note: "删除打卡，退回对应库存",
      createdBy: deletedBy,
      createdAt: nowISO(),
    });

    checkAndUpdateAlerts(alerts, customerId, u.productCode, row.remainingUnits);
  }

  inventoryMap[customerId] = rows;
  setInventoryMap(inventoryMap);
  setTransactionMap(txMap);
  setAlerts(alerts);

  checkInMap[customerId] = list.filter((c) => c.id !== checkInId);
  setCheckInMap(checkInMap);

  notifyInventoryChange();
  return { ok: true };
}

export function recordRepurchase(
  customerId: string,
  productCode: ProductCode,
  boxes: number,
  date: string | undefined,
  note: string | undefined,
  createdBy: string,
): EngineResult {
  if (!Number.isInteger(boxes) || boxes <= 0) {
    return { ok: false, error: "回购盒数必须是大于 0 的整数" };
  }
  const units = boxes * UNITS_PER_BOX;

  const inventoryMap = getInventoryMap();
  const rows = inventoryMap[customerId] ?? [];
  const row = findOrCreateRow(rows, customerId, productCode);
  row.boxesPurchased += boxes;
  row.totalAddedUnits += units;
  row.remainingUnits += units;
  row.updatedAt = nowISO();

  const createdAt = date ? new Date(date).toISOString() : nowISO();

  const txMap = getTransactionMap();
  pushTransaction(txMap, customerId, {
    id: genId("tx"),
    customerId,
    productCode,
    type: "REPURCHASE",
    quantityChange: units,
    balanceAfter: row.remainingUnits,
    note,
    createdBy,
    createdAt,
  });

  const alerts = getAlerts();
  completeAlertsForRepurchase(alerts, customerId, productCode);

  inventoryMap[customerId] = rows;
  setInventoryMap(inventoryMap);
  setTransactionMap(txMap);
  setAlerts(alerts);
  notifyInventoryChange();
  return { ok: true };
}

export function manualAdjustment(
  customerId: string,
  productCode: ProductCode,
  delta: number,
  reason: string,
  adjustedBy: string,
): EngineResult {
  if (!reason || !reason.trim()) {
    return { ok: false, error: "调整原因为必填" };
  }
  if (!Number.isInteger(delta) || delta === 0) {
    return { ok: false, error: "调整数量必须是不为 0 的整数" };
  }

  const inventoryMap = getInventoryMap();
  const rows = inventoryMap[customerId] ?? [];
  const row = findOrCreateRow(rows, customerId, productCode);

  const newRemaining = row.remainingUnits + delta;
  if (newRemaining < 0) {
    return { ok: false, error: `调整后库存不能小于 0（目前剩余 ${row.remainingUnits} 包）` };
  }

  if (delta > 0) row.totalAddedUnits += delta;
  else row.totalUsedUnits += -delta;
  row.remainingUnits = newRemaining;
  row.updatedAt = nowISO();

  const txMap = getTransactionMap();
  pushTransaction(txMap, customerId, {
    id: genId("tx"),
    customerId,
    productCode,
    type: "MANUAL_ADJUSTMENT",
    quantityChange: delta,
    balanceAfter: row.remainingUnits,
    note: reason,
    createdBy: adjustedBy,
    createdAt: nowISO(),
  });

  const alerts = getAlerts();
  checkAndUpdateAlerts(alerts, customerId, productCode, row.remainingUnits);

  inventoryMap[customerId] = rows;
  setInventoryMap(inventoryMap);
  setTransactionMap(txMap);
  setAlerts(alerts);
  notifyInventoryChange();
  return { ok: true };
}

export function markAlertFollowedUp(alertId: string, coachId: string): EngineResult {
  const alerts = getAlerts();
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx === -1) return { ok: false, error: "找不到这条提醒" };
  alerts[idx] = { ...alerts[idx], status: "FOLLOWED_UP", followedUpAt: nowISO(), followedUpBy: coachId };
  setAlerts(alerts);
  notifyInventoryChange();
  return { ok: true };
}

export function dismissAlert(alertId: string): EngineResult {
  const alerts = getAlerts();
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx === -1) return { ok: false, error: "找不到这条提醒" };
  alerts[idx] = { ...alerts[idx], status: "DISMISSED" };
  setAlerts(alerts);
  notifyInventoryChange();
  return { ok: true };
}
