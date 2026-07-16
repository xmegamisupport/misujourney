import type { InventoryAlertStatus, InventoryTransactionType, ProductCode, RepurchaseAlertLevel } from "./types";

export const UNITS_PER_BOX = 20;

export const PRODUCT_LABELS: Record<ProductCode, string> = {
  MISU_N_PLUS: "MISU N+ 代餐",
  MISU_DX_PLUS: "MISU DX+ 排毒",
};

export const PRODUCT_ICONS: Record<ProductCode, string> = {
  MISU_N_PLUS: "🥤",
  MISU_DX_PLUS: "🌿",
};

export const TRANSACTION_TYPE_LABELS: Record<InventoryTransactionType, string> = {
  INITIAL_PURCHASE: "注册初始购买",
  CHECK_IN_USAGE: "打卡使用",
  MEAL_USAGE: "餐点记录使用",
  REPURCHASE: "回购",
  MANUAL_ADJUSTMENT: "手动调整",
  CHECK_IN_EDIT: "编辑打卡调整",
  CHECK_IN_DELETE: "删除打卡退回",
  MANUAL_INITIAL_BALANCE: "初始库存补登",
};

/**
 * Fixed remaining-sachet thresholds — the SINGLE source of truth for inventory
 * status, identical for every MISU product (N+ and DX+). Status depends only
 * on the current remaining count; there is deliberately no daily-rate or
 * estimated-days prediction (customers follow different usage plans, so
 * prediction is unreliable).
 *
 *   ≥ 9  →  SUFFICIENT      库存充足
 *   6–8  →  WATCH           建议留意库存
 *   1–5  →  REPURCHASE_SOON 建议准备回购
 *   0    →  OUT_OF_STOCK    产品已用完
 */
export const INVENTORY_STATUS_THRESHOLDS = {
  /** Remaining ≥ this → SUFFICIENT. */
  sufficientMin: 9,
  /** Remaining ≥ this (and below sufficientMin) → WATCH. */
  watchMin: 6,
  // Remaining 1..watchMin-1 → REPURCHASE_SOON; 0 → OUT_OF_STOCK.
} as const;

export const INVENTORY_ALERT_STATUS_LABELS: Record<InventoryAlertStatus, string> = {
  SUFFICIENT: "库存充足",
  WATCH: "建议留意库存",
  REPURCHASE_SOON: "建议准备回购",
  OUT_OF_STOCK: "产品已用完",
};

export const INVENTORY_ALERT_STATUS_STYLES: Record<InventoryAlertStatus, { chip: string; text: string }> = {
  SUFFICIENT: { chip: "bg-emerald-50 text-emerald-700", text: "text-emerald-700" },
  WATCH: { chip: "bg-amber-50 text-amber-700", text: "text-amber-700" },
  REPURCHASE_SOON: { chip: "bg-orange-50 text-orange-700", text: "text-orange-700" },
  OUT_OF_STOCK: { chip: "bg-rose-50 text-rose-700", text: "text-rose-700" },
};

/** Status from the current remaining sachet count alone — same rule for every
 * product (no productCode branch), no prediction. */
export function getInventoryAlertStatus(remainingUnits: number): InventoryAlertStatus {
  if (remainingUnits <= 0) return "OUT_OF_STOCK";
  if (remainingUnits >= INVENTORY_STATUS_THRESHOLDS.sufficientMin) return "SUFFICIENT";
  if (remainingUnits >= INVENTORY_STATUS_THRESHOLDS.watchMin) return "WATCH";
  return "REPURCHASE_SOON";
}

const STATUS_SEVERITY: Record<InventoryAlertStatus, number> = {
  SUFFICIENT: 0,
  WATCH: 1,
  REPURCHASE_SOON: 2,
  OUT_OF_STOCK: 3,
};

/** Worst-case status across multiple products, for a single combined badge. */
export function combineAlertStatuses(statuses: InventoryAlertStatus[]): InventoryAlertStatus {
  return statuses.reduce((worst, s) => (STATUS_SEVERITY[s] > STATUS_SEVERITY[worst] ? s : worst), "SUFFICIENT" as InventoryAlertStatus);
}

export function compareAlertStatusSeverity(a: InventoryAlertStatus, b: InventoryAlertStatus): number {
  return STATUS_SEVERITY[b] - STATUS_SEVERITY[a];
}

// ---------- Coach repurchase-alert follow-up level ----------
// A separate concept from the customer-facing inventory status above: these
// describe the DB-generated repurchase_alerts the Coach follows up on.

export const REPURCHASE_ALERT_LEVEL_LABELS: Record<RepurchaseAlertLevel, string> = {
  REPURCHASE_SOON: "建议准备回购",
  URGENT: "即将用完",
  OUT_OF_STOCK: "已无库存",
};

export const REPURCHASE_ALERT_LEVEL_STYLES: Record<RepurchaseAlertLevel, { chip: string; text: string }> = {
  REPURCHASE_SOON: { chip: "bg-amber-50 text-amber-700", text: "text-amber-700" },
  URGENT: { chip: "bg-orange-50 text-orange-700", text: "text-orange-700" },
  OUT_OF_STOCK: { chip: "bg-rose-50 text-rose-700", text: "text-rose-700" },
};

const REPURCHASE_ALERT_LEVEL_SEVERITY: Record<RepurchaseAlertLevel, number> = {
  REPURCHASE_SOON: 0,
  URGENT: 1,
  OUT_OF_STOCK: 2,
};

export function compareRepurchaseAlertLevelSeverity(a: RepurchaseAlertLevel, b: RepurchaseAlertLevel): number {
  return REPURCHASE_ALERT_LEVEL_SEVERITY[b] - REPURCHASE_ALERT_LEVEL_SEVERITY[a];
}
