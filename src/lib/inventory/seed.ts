"use client";

import { hasInventoryRecords, initializeLegacyBalance } from "./engine";
import { getInventoryMap, setInventoryMap, getTransactionMap, setTransactionMap } from "./storage";
import type { ProductCode } from "./types";

/**
 * Demo seed data for the Coach-side mock customers (everyone except
 * currentCustomer, who is intentionally left un-seeded so the "legacy
 * customer" initialization flow has something real to demo). Numbers are
 * chosen to land in different alert bands so the repurchase alert center
 * has something to show out of the box.
 */
const SEED_DATA: Record<string, Partial<Record<ProductCode, number>>> = {
  "cust-002": { MISU_N_PLUS: 8, MISU_DX_PLUS: 15 }, // 建议准备回购 both
  "cust-003": { MISU_N_PLUS: 55, MISU_DX_PLUS: 35 }, // 库存充足
  "cust-004": { MISU_N_PLUS: 3, MISU_DX_PLUS: 0 }, // 即将用完 / 已无库存
  "cust-005": { MISU_N_PLUS: 0, MISU_DX_PLUS: 6 }, // 已无库存 / 即将用完
};

/** cust-002 gets a few backdated usage transactions so its 7-day average usage /
 * estimated-days-remaining calculation on the Coach side has real data to show. */
function seedBackdatedUsage(customerId: string, productCode: ProductCode, targetRemaining: number, daysOfHistory: number) {
  const inventoryMap = getInventoryMap();
  const row = (inventoryMap[customerId] ?? []).find((r) => r.productCode === productCode);
  if (!row) return;

  // Bump the row up so the simulated historical usage brings it back down to targetRemaining.
  row.remainingUnits = targetRemaining + daysOfHistory;
  row.totalAddedUnits += daysOfHistory;

  const txMap = getTransactionMap();
  const list = txMap[customerId] ?? [];

  for (let i = daysOfHistory; i >= 1; i--) {
    row.totalUsedUnits += 1;
    row.remainingUnits -= 1;
    const createdAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString();
    list.push({
      id: `tx_seed_${customerId}_${productCode}_${i}`,
      customerId,
      productCode,
      type: "CHECK_IN_USAGE",
      quantityChange: -1,
      balanceAfter: row.remainingUnits,
      note: "示例数据：模拟每日打卡使用",
      createdBy: "system-seed",
      createdAt,
    });
  }

  txMap[customerId] = list;
  setTransactionMap(txMap);
  setInventoryMap(inventoryMap);
}

let seeded = false;

export function ensureMockInventorySeeded() {
  if (typeof window === "undefined" || seeded) return;
  seeded = true;
  for (const [customerId, remaining] of Object.entries(SEED_DATA)) {
    if (!hasInventoryRecords(customerId)) {
      initializeLegacyBalance(customerId, remaining, "system-seed");
    }
  }

  if (hasInventoryRecords("cust-002")) {
    seedBackdatedUsage("cust-002", "MISU_N_PLUS", 8, 5);
    seedBackdatedUsage("cust-002", "MISU_DX_PLUS", 15, 5);
  }
}
