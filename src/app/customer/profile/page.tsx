"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountSettingsSection } from "@/components/AccountSettingsSection";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { InventoryStatusCard } from "@/components/inventory/InventoryStatusCard";
import { JourneyCoachCard } from "@/components/customer/JourneyCoachCard";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useHasInventoryRecords, useCustomerInventory } from "@/lib/inventory/hooks";
import type { ProductCode } from "@/lib/inventory/types";

const inventoryProducts: ProductCode[] = ["MISU_N_PLUS", "MISU_DX_PLUS"];

const linkItems = [
  { href: "/customer/progress", label: "我的进展", icon: "📈" },
  { href: "/customer/points-guide", label: "Journey Points 说明", icon: "🌱" },
  { href: "/customer/coach", label: "我的 Journey Coach", icon: "🌿" },
  { href: "/customer/notifications", label: "通知中心", icon: "🔔" },
  { href: "/customer/learn/guide", label: "产品使用指南", icon: "📦" },
  { href: "/customer/learn/faq", label: "常见问题", icon: "💬" },
];

const staticItems = [
  { label: "通知设置", icon: "🔔" },
  { label: "隐私政策", icon: "🔒" },
];

export default function CustomerProfilePage() {
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const { data: journey } = useJourneySummary(customerId);
  const currentWeight = journey?.latestWeight ?? journey?.startWeight ?? null;
  const { data: hasInventory } = useHasInventoryRecords(customerId);
  const { data: inventoryRows } = useCustomerInventory(customerId);

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="我的" />

      <div className="flex items-center gap-4 rounded-card border border-brand-soft/40 bg-gradient-to-br from-brand-tint to-[#f6f2f3] p-5 shadow-elev1">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
          {journey?.avatar ?? "🙂"}
        </span>
        <div>
          <p className="text-lg font-semibold text-ink">{journey?.name ?? ""}</p>
          <p className="text-sm text-ink-soft">
            Day {journey?.currentDay ?? 1} / {journey?.planLength ?? 30}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-line bg-surface p-3 text-center shadow-sm">
          <p className="text-base font-semibold text-ink">{journey?.age ?? "—"}</p>
          <p className="text-xs text-ink-faint">年龄</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-3 text-center shadow-sm">
          <p className="text-base font-semibold text-ink">{journey?.height ?? "—"}cm</p>
          <p className="text-xs text-ink-faint">身高</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-3 text-center shadow-sm">
          <p className="text-base font-semibold text-ink">{currentWeight ?? "—"}kg</p>
          <p className="text-xs text-ink-faint">当前体重</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink">我的产品库存</p>
        {hasInventory ? (
          <div className="grid grid-cols-2 gap-3">
            {inventoryProducts.map((productCode) => {
              const row = inventoryRows.find((r) => r.productCode === productCode);
              return (
                <InventoryStatusCard
                  key={productCode}
                  productCode={productCode}
                  remainingUnits={row?.remainingUnits ?? 0}
                  totalUsedUnits={row?.totalUsedUnits ?? 0}
                />
              );
            })}
          </div>
        ) : (
          <Link
            href="/customer/checkin"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-4 transition hover:border-amber-300"
          >
            <span className="text-2xl">📦</span>
            <div>
              <p className="text-sm font-semibold text-ink">请先更新你的 MISU 产品库存</p>
              <p className="text-xs text-ink-soft">填写目前剩余包数，开始追踪库存 →</p>
            </div>
          </Link>
        )}
      </div>

      <JourneyCoachCard />

      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        {linkItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 border-b border-line-soft px-4 py-3.5 text-sm text-ink last:border-b-0 hover:bg-canvas"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-ink-faint">→</span>
          </Link>
        ))}
      </div>

      <AccountSettingsSection />

      <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
        <LanguageSwitcher />
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        {staticItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 border-b border-line-soft px-4 py-3.5 text-sm text-ink last:border-b-0"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-ink-faint">→</span>
          </div>
        ))}
      </div>

      <SignOutButton className="rounded-full border border-rose-100 bg-rose-50 py-3 text-center text-sm font-semibold text-rose-500 transition hover:bg-rose-100" />
    </div>
  );
}
