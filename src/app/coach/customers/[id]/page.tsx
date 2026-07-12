"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ScoreCircle } from "@/components/ui/ScoreCircle";
import { TrendChart } from "@/components/ui/TrendChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { allCustomers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useCustomerInventory, useCustomerTransactions, useCustomerCheckIns } from "@/lib/inventory/hooks";
import { calcAverageDailyUsage, calcEstimatedDaysRemaining, recordRepurchase, manualAdjustment } from "@/lib/inventory/engine";
import {
  PRODUCT_LABELS,
  PRODUCT_ICONS,
  TRANSACTION_TYPE_LABELS,
  INVENTORY_ALERT_STATUS_LABELS,
  INVENTORY_ALERT_STATUS_STYLES,
  getInventoryAlertStatus,
} from "@/lib/inventory/constants";
import { parsePositiveInt } from "@/lib/inventory/validation";
import type { ProductCode } from "@/lib/inventory/types";

const stockLabel = { ok: "库存充足", low: "即将用完", out: "已用完" } as const;
const stockColor = { ok: "bg-emerald-50 text-emerald-600", low: "bg-amber-50 text-amber-600", out: "bg-rose-50 text-rose-500" } as const;

const productCodes: ProductCode[] = ["MISU_N_PLUS", "MISU_DX_PLUS"];

const COACH_ID = "coach-001";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customer = allCustomers.find((c) => c.id === params.id);
  const [notes, setNotes] = useState<string[]>([
    "顾客反馈晚餐容易嘴馋，建议加餐搭配高纤维食物。",
    "已提醒顾客本周需补充产品库存。",
  ]);
  const [draft, setDraft] = useState("");

  const inventoryRows = useCustomerInventory(customer?.id ?? "");
  const transactions = useCustomerTransactions(customer?.id ?? "");
  const checkIns = useCustomerCheckIns(customer?.id ?? "");

  const [repurchaseOpen, setRepurchaseOpen] = useState(false);
  const [repurchaseProduct, setRepurchaseProduct] = useState<ProductCode>("MISU_N_PLUS");
  const [repurchaseBoxes, setRepurchaseBoxes] = useState("1");
  const [repurchaseDate, setRepurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [repurchaseNote, setRepurchaseNote] = useState("");
  const [repurchaseError, setRepurchaseError] = useState<string | null>(null);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<ProductCode>("MISU_N_PLUS");
  const [adjustDirection, setAdjustDirection] = useState<"add" | "subtract">("add");
  const [adjustQuantity, setAdjustQuantity] = useState("1");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);

  if (!customer) {
    return (
      <div className="px-4 py-10 md:px-8">
        <PageHeader title="顾客详情" backHref="/coach/customers" />
        <EmptyState icon="🔍" title="找不到这位顾客" />
      </div>
    );
  }

  const weightChange = +(customer.weightTrend[0].value - customer.currentWeight).toFixed(1);
  const avgScore = Math.round(
    customer.scoreTrend.reduce((sum, p) => sum + p.value, 0) / customer.scoreTrend.length,
  );

  function handleRepurchaseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    const boxes = parsePositiveInt(repurchaseBoxes);
    if (boxes === null) {
      setRepurchaseError("回购盒数必须是大于 0 的整数");
      return;
    }
    const result = recordRepurchase(customer.id, repurchaseProduct, boxes, repurchaseDate || undefined, repurchaseNote.trim() || undefined, COACH_ID);
    if (!result.ok) {
      setRepurchaseError(result.error ?? "回购记录失败，请重试");
      return;
    }
    setRepurchaseOpen(false);
    setRepurchaseBoxes("1");
    setRepurchaseNote("");
    setRepurchaseError(null);
  }

  function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    const qty = parsePositiveInt(adjustQuantity);
    if (qty === null) {
      setAdjustError("调整数量必须是大于 0 的整数");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError("调整原因为必填");
      return;
    }
    const delta = adjustDirection === "add" ? qty : -qty;
    const result = manualAdjustment(customer.id, adjustProduct, delta, adjustReason.trim(), COACH_ID);
    if (!result.ok) {
      setAdjustError(result.error ?? "调整失败，请重试");
      return;
    }
    setAdjustOpen(false);
    setAdjustQuantity("1");
    setAdjustReason("");
    setAdjustError(null);
  }

  const sortedTransactions = [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const repurchaseHistory = sortedTransactions.filter((t) => t.type === "REPURCHASE");
  const sortedCheckIns = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title={customer.name} subtitle={`Day ${customer.currentDay} / ${customer.planLength}`} backHref="/coach/customers" />

      <div className="flex items-start gap-4 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50 p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
          {customer.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-slate-900">{customer.name}</p>
          <p className="text-sm text-slate-500">
            {customer.gender === "female" ? "女" : "男"} · {customer.age} 岁 · {customer.height}cm · {customer.phone}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {customer.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-sky-600">
                {tag}
              </span>
            ))}
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${stockColor[customer.productStock]}`}>
              产品：{stockLabel[customer.productStock]}
            </span>
          </div>
        </div>
      </div>

      {/* ---------- 产品库存 ---------- */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">产品库存</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setRepurchaseOpen((v) => !v);
                setAdjustOpen(false);
              }}
              className="rounded-full border border-sky-200 px-3 py-1.5 text-xs font-medium text-sky-600 transition hover:bg-sky-50"
            >
              新增回购
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustOpen((v) => !v);
                setRepurchaseOpen(false);
              }}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              手动调整库存
            </button>
          </div>
        </div>

        {inventoryRows.length === 0 ? (
          <EmptyState icon="📦" title="这位顾客还没有产品库存资料" description="等待顾客完成注册或补登库存后会自动出现在这里" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {productCodes.map((code) => {
              const row = inventoryRows.find((r) => r.productCode === code);
              if (!row) return null;
              const status = getInventoryAlertStatus(code, row.remainingUnits);
              const avgDailyUsage = calcAverageDailyUsage(customer.id, code);
              const estimatedDays = calcEstimatedDaysRemaining(row.remainingUnits, avgDailyUsage);
              return (
                <div key={code} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <span>{PRODUCT_ICONS[code]}</span>
                      {PRODUCT_LABELS[code]}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", INVENTORY_ALERT_STATUS_STYLES[status].chip)}>
                      {INVENTORY_ALERT_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <p className="text-2xl font-semibold text-slate-900">
                    {row.remainingUnits}
                    <span className="ml-1 text-sm font-normal text-slate-400">包剩余</span>
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>初始购买 {row.boxesPurchased} 盒</span>
                    <span>初始库存 {row.initialUnits} 包</span>
                    <span>总使用 {row.totalUsedUnits} 包</span>
                    <span>累计新增 {row.totalAddedUnits} 包</span>
                    <span>近 7 天日均 {avgDailyUsage !== null ? `${avgDailyUsage.toFixed(1)} 包` : "暂无记录"}</span>
                    <span>预计还能用 {estimatedDays !== null ? `${estimatedDays} 天` : "暂无法估算"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {repurchaseOpen && (
          <form onSubmit={handleRepurchaseSubmit} className="mt-3 flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
            <p className="text-sm font-semibold text-slate-700">新增回购</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs text-slate-600">
                产品
                <select
                  value={repurchaseProduct}
                  onChange={(e) => setRepurchaseProduct(e.target.value as ProductCode)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                >
                  {productCodes.map((code) => (
                    <option key={code} value={code}>
                      {PRODUCT_LABELS[code]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-slate-600">
                回购盒数
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={repurchaseBoxes}
                  onChange={(e) => setRepurchaseBoxes(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-slate-600">
                回购日期
                <input
                  type="date"
                  value={repurchaseDate}
                  onChange={(e) => setRepurchaseDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-slate-600">
                备注 · 选填
                <input
                  type="text"
                  value={repurchaseNote}
                  onChange={(e) => setRepurchaseNote(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
            </div>
            {repurchaseError && <p className="text-xs text-rose-600">{repurchaseError}</p>}
            <button type="submit" className="rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600">
              确认新增回购
            </button>
          </form>
        )}

        {adjustOpen && (
          <form onSubmit={handleAdjustSubmit} className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">手动调整库存</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs text-slate-600">
                产品
                <select
                  value={adjustProduct}
                  onChange={(e) => setAdjustProduct(e.target.value as ProductCode)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  {productCodes.map((code) => (
                    <option key={code} value={code}>
                      {PRODUCT_LABELS[code]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-slate-600">
                增加 / 减少
                <select
                  value={adjustDirection}
                  onChange={(e) => setAdjustDirection(e.target.value as "add" | "subtract")}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  <option value="add">增加</option>
                  <option value="subtract">减少</option>
                </select>
              </label>
              <label className="col-span-2 flex flex-col gap-1.5 text-xs text-slate-600">
                调整数量（包）
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1.5 text-xs text-slate-600">
                调整原因（必填）
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  rows={2}
                  placeholder="例如：顾客漏填购买数量 / 赠品 / 实际库存与系统不一致"
                  className="resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </label>
            </div>
            {adjustError && <p className="text-xs text-rose-600">{adjustError}</p>}
            <button type="submit" className="rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900">
              确认调整
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="打卡率" value={`${customer.checkinRate}%`} icon="✅" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="连续打卡" value={customer.streakDays} unit="天" icon="🔥" accent="bg-amber-50 text-amber-600" />
        <StatCard label="当前体重" value={customer.currentWeight} unit="kg" icon="⚖️" accent="bg-sky-50 text-sky-600" />
        <StatCard label="最后打卡" value={customer.lastCheckIn} accent="bg-slate-100 text-slate-500" />
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <ScoreCircle value={customer.todayMisuScore} size={80} label="MISU Score" colorClass="text-emerald-500" trackClass="text-emerald-100" />
        <div>
          <p className="text-sm font-semibold text-slate-800">今日 MISU Score</p>
          <p className="text-sm text-slate-500">本周平均分 {avgScore} 分</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-700">体重趋势</p>
        <TrendChart data={customer.weightTrend} unit="kg" strokeClass="text-emerald-500" fillId={`detail-weight-${customer.id}`} />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-700">腰围趋势</p>
        <TrendChart data={customer.waistTrend} unit="cm" strokeClass="text-sky-500" fillId={`detail-waist-${customer.id}`} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">今日饮食记录</p>
        <div className="flex flex-col gap-2">
          {customer.meals.map((meal) => (
            <div key={meal.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                {meal.photoEmoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{meal.name}</p>
                <p className="text-xs text-slate-400">{meal.time} · {meal.calories}kcal</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                {meal.misuScore}分
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- 打卡使用记录 ---------- */}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">打卡使用记录</p>
        {sortedCheckIns.length === 0 ? (
          <EmptyState icon="📋" title="还没有打卡记录" />
        ) : (
          <div className="flex flex-col gap-2">
            {sortedCheckIns.map((ci) => (
              <div key={ci.id} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{ci.date}</p>
                  <p className="text-xs text-slate-400">
                    体重 {ci.weight}kg · 排便 {ci.poopCount === "3+" ? "3次及以上" : `${ci.poopCount}次`} · 睡眠 {ci.bedtime}-{ci.wakeTime}
                  </p>
                </div>
                {ci.productUsage.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ci.productUsage.map((u) => (
                      <span key={u.productCode} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {PRODUCT_ICONS[u.productCode]} {PRODUCT_LABELS[u.productCode]} × {u.quantity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- 回购记录 ---------- */}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">回购记录</p>
        {repurchaseHistory.length === 0 ? (
          <EmptyState icon="🛒" title="还没有回购记录" />
        ) : (
          <div className="flex flex-col gap-2">
            {repurchaseHistory.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {PRODUCT_ICONS[tx.productCode]} {PRODUCT_LABELS[tx.productCode]} +{tx.quantityChange} 包
                  </p>
                  <p className="text-xs text-slate-400">{tx.createdAt.slice(0, 10)} · 操作人 {tx.createdBy}</p>
                </div>
                <span className="text-xs text-slate-400">余额 {tx.balanceAfter}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- 产品库存流水记录 ---------- */}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">产品库存流水记录</p>
        {sortedTransactions.length === 0 ? (
          <EmptyState icon="🧾" title="还没有库存流水" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="px-3 py-2.5 font-medium">时间</th>
                  <th className="px-3 py-2.5 font-medium">产品</th>
                  <th className="px-3 py-2.5 font-medium">类型</th>
                  <th className="px-3 py-2.5 font-medium">变化</th>
                  <th className="px-3 py-2.5 font-medium">余额</th>
                  <th className="px-3 py-2.5 font-medium">备注</th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="px-3 py-2.5 text-slate-500">{tx.createdAt.slice(0, 16).replace("T", " ")}</td>
                    <td className="px-3 py-2.5 text-slate-600">{PRODUCT_LABELS[tx.productCode]}</td>
                    <td className="px-3 py-2.5 text-slate-600">{TRANSACTION_TYPE_LABELS[tx.type]}</td>
                    <td className={cn("px-3 py-2.5 font-medium", tx.quantityChange >= 0 ? "text-emerald-600" : "text-rose-500")}>
                      {tx.quantityChange >= 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{tx.balanceAfter}</td>
                    <td className="px-3 py-2.5 text-slate-400">{tx.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">每周报告</p>
        <ul className="flex flex-col gap-1.5 text-sm text-slate-600">
          <li>· 本周体重变化 {weightChange >= 0 ? `-${weightChange}` : `+${Math.abs(weightChange)}`}kg</li>
          <li>· 本周平均 MISU Score {avgScore} 分</li>
          <li>· 本周打卡率 {customer.checkinRate}%</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">跟进备注</p>
        <div className="flex flex-col gap-2">
          {notes.map((note, i) => (
            <div key={i} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {note}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="添加跟进备注"
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="button"
            onClick={() => {
              if (!draft.trim()) return;
              setNotes((prev) => [...prev, draft.trim()]);
              setDraft("");
            }}
            className="rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
