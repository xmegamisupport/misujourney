export type ProductCode = "MISU_N_PLUS" | "MISU_DX_PLUS";

export interface CustomerInventory {
  id: string;
  customerId: string;
  productCode: ProductCode;
  boxesPurchased: number;
  unitsPerBox: number;
  initialUnits: number;
  totalAddedUnits: number;
  totalUsedUnits: number;
  remainingUnits: number;
  createdAt: string;
  updatedAt: string;
}

export type InventoryTransactionType =
  | "INITIAL_PURCHASE"
  | "CHECK_IN_USAGE"
  | "MEAL_USAGE"
  | "REPURCHASE"
  | "MANUAL_ADJUSTMENT"
  | "CHECK_IN_EDIT"
  | "CHECK_IN_DELETE"
  | "MANUAL_INITIAL_BALANCE";

export interface InventoryTransaction {
  id: string;
  customerId: string;
  productCode: ProductCode;
  type: InventoryTransactionType;
  quantityChange: number;
  balanceAfter: number;
  /** Id of the record that caused this change — a DailyCheckIn id for
   * CHECK_IN_* types, or a meal id for MEAL_USAGE. Used for idempotency. */
  relatedCheckInId?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export type InventoryAlertStatus = "SUFFICIENT" | "REPURCHASE_SOON" | "URGENT" | "OUT_OF_STOCK";

export type RepurchaseAlertLevel = "REPURCHASE_SOON" | "URGENT" | "OUT_OF_STOCK";

export type RepurchaseAlertState = "OPEN" | "FOLLOWED_UP" | "COMPLETED" | "DISMISSED";

export interface RepurchaseAlert {
  id: string;
  customerId: string;
  productCode: ProductCode;
  status: RepurchaseAlertState;
  alertLevel: RepurchaseAlertLevel;
  remainingUnitsWhenTriggered: number;
  triggeredAt: string;
  followedUpAt?: string;
  followedUpBy?: string;
  completedAt?: string;
  note?: string;
}

export type PoopCount = "0" | "1" | "2" | "3+";

export interface ProductUsageEntry {
  productCode: ProductCode;
  quantity: number;
}

export interface DailyCheckIn {
  id: string;
  customerId: string;
  date: string;
  weight: number;
  poopCount: PoopCount;
  bedtime: string;
  wakeTime: string;
  productUsage: ProductUsageEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface EngineResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}
