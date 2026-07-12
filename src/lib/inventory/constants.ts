import type { InventoryAlertStatus, InventoryTransactionType, ProductCode } from "./types";

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
 * repurchaseSoon / urgent are both expressed as "remaining units at or below
 * this number" thresholds. OUT_OF_STOCK is always remainingUnits <= 0.
 */
export const INVENTORY_ALERT_THRESHOLDS: Record<ProductCode, { repurchaseSoon: number; urgent: number }> = {
  MISU_N_PLUS: { repurchaseSoon: 10, urgent: 5 },
  MISU_DX_PLUS: { repurchaseSoon: 20, urgent: 10 },
};

export const INVENTORY_ALERT_STATUS_LABELS: Record<InventoryAlertStatus, string> = {
  SUFFICIENT: "库存充足",
  REPURCHASE_SOON: "建议准备回购",
  URGENT: "即将用完",
  OUT_OF_STOCK: "已无库存",
};

export const INVENTORY_ALERT_STATUS_STYLES: Record<InventoryAlertStatus, { chip: string; text: string }> = {
  SUFFICIENT: { chip: "bg-emerald-50 text-emerald-700", text: "text-emerald-700" },
  REPURCHASE_SOON: { chip: "bg-amber-50 text-amber-700", text: "text-amber-700" },
  URGENT: { chip: "bg-orange-50 text-orange-700", text: "text-orange-700" },
  OUT_OF_STOCK: { chip: "bg-rose-50 text-rose-700", text: "text-rose-700" },
};

export function getInventoryAlertStatus(productCode: ProductCode, remainingUnits: number): InventoryAlertStatus {
  if (remainingUnits <= 0) return "OUT_OF_STOCK";
  const { repurchaseSoon, urgent } = INVENTORY_ALERT_THRESHOLDS[productCode];
  if (remainingUnits <= urgent) return "URGENT";
  if (remainingUnits <= repurchaseSoon) return "REPURCHASE_SOON";
  return "SUFFICIENT";
}

const STATUS_SEVERITY: Record<InventoryAlertStatus, number> = {
  SUFFICIENT: 0,
  REPURCHASE_SOON: 1,
  URGENT: 2,
  OUT_OF_STOCK: 3,
};

/** Worst-case status across multiple products, for a single combined badge. */
export function combineAlertStatuses(statuses: InventoryAlertStatus[]): InventoryAlertStatus {
  return statuses.reduce((worst, s) => (STATUS_SEVERITY[s] > STATUS_SEVERITY[worst] ? s : worst), "SUFFICIENT" as InventoryAlertStatus);
}

export function compareAlertStatusSeverity(a: InventoryAlertStatus, b: InventoryAlertStatus): number {
  return STATUS_SEVERITY[b] - STATUS_SEVERITY[a];
}
