import {
  PRODUCT_LABELS,
  PRODUCT_ICONS,
  INVENTORY_ALERT_STATUS_LABELS,
  INVENTORY_ALERT_STATUS_STYLES,
  getInventoryAlertStatus,
} from "@/lib/inventory/constants";
import type { ProductCode } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

interface InventoryStatusCardProps {
  productCode: ProductCode;
  remainingUnits: number;
  totalUsedUnits: number;
  estimatedDaysRemaining: number | null;
}

export function InventoryStatusCard({
  productCode,
  remainingUnits,
  totalUsedUnits,
  estimatedDaysRemaining,
}: InventoryStatusCardProps) {
  const status = getInventoryAlertStatus(productCode, remainingUnits);
  const style = INVENTORY_ALERT_STATUS_STYLES[status];

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <span>{PRODUCT_ICONS[productCode]}</span>
          {PRODUCT_LABELS[productCode]}
        </span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", style.chip)}>
          {INVENTORY_ALERT_STATUS_LABELS[status]}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-slate-900">{remainingUnits}</span>
        <span className="text-sm text-slate-400">包剩余</span>
      </div>
      <p className="text-xs text-slate-400">
        {estimatedDaysRemaining !== null ? `大约剩余 ${estimatedDaysRemaining} 天` : "暂时没有足够记录计算"}
      </p>
      <p className="text-xs text-slate-400">已使用 {totalUsedUnits} 包</p>
    </div>
  );
}
