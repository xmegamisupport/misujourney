"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { TrendChart } from "@/components/ui/TrendChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useCustomerProfile } from "@/lib/coach/hooks";
import { useCurrentCustomerGoal } from "@/lib/goals/hooks";
import { useCustomerInventory, useCustomerTransactions, useCustomerCheckIns, useTodayMeals } from "@/lib/inventory/hooks";
import { calcAverageDailyUsage, calcEstimatedDaysRemaining, recordRepurchase, manualAdjustment } from "@/lib/inventory/engine";
import {
  PRODUCT_LABELS,
  PRODUCT_ICONS,
  TRANSACTION_TYPE_LABELS,
  INVENTORY_ALERT_STATUS_LABELS,
  INVENTORY_ALERT_STATUS_STYLES,
  getInventoryAlertStatus,
  combineAlertStatuses,
} from "@/lib/inventory/constants";
import { parsePositiveInt } from "@/lib/inventory/validation";
import { useActiveAttentionFlags, useLatestCustomerInsight } from "@/lib/insights/hooks";
import { SEVERITY_STYLES } from "@/lib/insights/constants";
import { buildCustomerTrendSummary } from "@/lib/insights/summary";
import { createClient } from "@/lib/supabase/client";
import type { CustomerTrendSummary, AnalysisType } from "@/lib/insights/types";
import type { ProductCode } from "@/lib/inventory/types";

const productCodes: ProductCode[] = ["MISU_N_PLUS", "MISU_DX_PLUS"];
const DIET_LABELS: Record<string, string> = { regular: "一般饮食", vegetarian: "素食", ovo_lacto_vegetarian: "蛋奶素", vegan: "全素", other: "其他" };

const weightTrendLabels: Record<CustomerTrendSummary["weight"]["trend"], string> = {
  down: "体重下降",
  up: "体重上升",
  stable: "暂时稳定",
  insufficient: "资料不足",
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const { user } = useAuthUser();

  const { data: profile, loading: profileLoading } = useCustomerProfile(customerId);
  const { data: journey } = useJourneySummary(customerId);
  const { data: currentGoal } = useCurrentCustomerGoal(customerId);
  const { data: flags } = useActiveAttentionFlags(customerId);

  const [notes, setNotes] = useState<string[]>([
    "顾客反馈晚餐容易嘴馋，建议加餐搭配高纤维食物。",
    "已提醒顾客本周需补充产品库存。",
  ]);
  const [draft, setDraft] = useState("");

  const { data: inventoryRows } = useCustomerInventory(customerId);
  const { data: transactions } = useCustomerTransactions(customerId);
  const { data: checkIns } = useCustomerCheckIns(customerId);
  const { data: todayMeals } = useTodayMeals(customerId);

  const [analysisType, setAnalysisType] = useState<AnalysisType>("weekly_7_day");
  const { data: insight, refresh: refreshInsight } = useLatestCustomerInsight(customerId, analysisType);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [trendSummary, setTrendSummary] = useState<CustomerTrendSummary | null>(null);

  const periodDays = analysisType === "biweekly_14_day" ? 14 : 7;
  const insightIsFromToday = insight ? insight.generatedAt.slice(0, 10) === new Date().toISOString().slice(0, 10) : false;

  useEffect(() => {
    if (!customerId) return;
    const supabase = createClient();
    buildCustomerTrendSummary(supabase, customerId, { periodDays, waterTargetMl: currentGoal?.waterTargetMl ?? 2000 })
      .then(setTrendSummary)
      .catch((err) => console.error("Failed to build trend summary", err));
  }, [customerId, periodDays, currentGoal?.waterTargetMl]);

  async function handleGenerateInsight() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/generate-customer-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, analysisType }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "生成失败，请稍后再试");
      }
      refreshInsight();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "生成失败，请稍后再试");
    } finally {
      setGenerating(false);
    }
  }

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

  const sortedTransactions = useMemo(() => [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [transactions]);
  const repurchaseHistory = sortedTransactions.filter((t) => t.type === "REPURCHASE");
  const sortedCheckIns = useMemo(() => [...checkIns].sort((a, b) => b.date.localeCompare(a.date)), [checkIns]);
  const weightTrendData = useMemo(() => [...checkIns].reverse().map((ci) => ({ label: ci.date.slice(5), value: ci.weight })), [checkIns]);

  const currentDay = journey?.currentDay ?? 1;
  const latestWeight = journey?.latestWeight ?? journey?.startWeight ?? null;
  const checkinRate = currentDay > 0 ? Math.min(100, Math.round((checkIns.length / currentDay) * 100)) : 0;

  const inventoryStatuses = inventoryRows.map((r) => getInventoryAlertStatus(r.productCode, r.remainingUnits));
  const combinedStockStatus = inventoryRows.length > 0 ? combineAlertStatuses(inventoryStatuses) : null;

  if (!user || profileLoading) {
    return <div className="px-4 py-10 text-center text-sm text-slate-400">加载中...</div>;
  }

  if (!profile) {
    return (
      <div className="px-4 py-10 md:px-8">
        <PageHeader title="顾客详情" backHref="/coach/customers" />
        <EmptyState icon="🔍" title="找不到这位顾客，或你没有权限查看" />
      </div>
    );
  }

  async function handleRepurchaseSubmit(e: React.FormEvent) {
    e.preventDefault();
    const boxes = parsePositiveInt(repurchaseBoxes);
    if (boxes === null) {
      setRepurchaseError("回购盒数必须是大于 0 的整数");
      return;
    }
    const result = await recordRepurchase(customerId, repurchaseProduct, boxes, repurchaseDate || undefined, repurchaseNote.trim() || undefined);
    if (!result.ok) {
      setRepurchaseError(result.error ?? "回购记录失败，请重试");
      return;
    }
    setRepurchaseOpen(false);
    setRepurchaseBoxes("1");
    setRepurchaseNote("");
    setRepurchaseError(null);
  }

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    const result = await manualAdjustment(customerId, adjustProduct, delta, adjustReason.trim());
    if (!result.ok) {
      setAdjustError(result.error ?? "调整失败，请重试");
      return;
    }
    setAdjustOpen(false);
    setAdjustQuantity("1");
    setAdjustReason("");
    setAdjustError(null);
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title={profile.name} subtitle={`Day ${currentDay} / ${journey?.planLength ?? 30}`} backHref="/coach/customers" />

      <div className="flex items-start gap-4 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50 p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-3xl shadow-sm">{profile.avatar ?? "🙂"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-slate-900">{profile.name}</p>
          <p className="text-sm text-slate-500">
            {profile.gender === "female" ? "女" : profile.gender === "male" ? "男" : "—"} · {profile.age ?? "—"} 岁 · {profile.height ?? "—"}cm · {profile.phone ?? "—"}
            {profile.dietType && ` · ${DIET_LABELS[profile.dietType] ?? profile.dietType}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {flags.map((flag) => (
              <span key={flag.id} className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", SEVERITY_STYLES[flag.severity])}>
                {flag.flagLabel}
              </span>
            ))}
            {combinedStockStatus && (
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", INVENTORY_ALERT_STATUS_STYLES[combinedStockStatus].chip)}>
                产品：{INVENTORY_ALERT_STATUS_LABELS[combinedStockStatus]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---------- 本周重点观察 ---------- */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">📋 本周重点观察</p>
        {trendSummary ? (
          <div className="grid grid-cols-2 gap-y-2.5 text-sm text-slate-600 md:grid-cols-3">
            <p>标准晨重 {trendSummary.weight.validEntries}天</p>
            <p>体重趋势 {weightTrendLabels[trendSummary.weight.trend]}</p>
            <p>排便 {trendSummary.bowelMovement.zeroDays}天无排便</p>
            <p>聚餐 {trendSummary.specialConditions.gathering}次</p>
            <p>外食较多 {trendSummary.specialConditions.eating_out}天</p>
            <p>熬夜 {trendSummary.specialConditions.late_night}天</p>
            <p>
              饮水达标 {trendSummary.habits.waterTargetDays}/{trendSummary.period.days}天
            </p>
            <p>211餐盘完成 {trendSummary.habits.plate211Meals}餐</p>
            <p>MISU N+打卡 {trendSummary.habits.misuNTotalSachets}包</p>
            <p>MISU DX+打卡 {trendSummary.habits.misuDxTotalSachets}包</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">正在整理最近记录...</p>
        )}
      </div>

      {/* ---------- AI趋势摘要 ---------- */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">🤖 AI 趋势摘要</p>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-slate-200 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAnalysisType("weekly_7_day")}
                className={cn("rounded-full px-2.5 py-1 font-medium transition", analysisType === "weekly_7_day" ? "bg-emerald-500 text-white" : "text-slate-500")}
              >
                7天
              </button>
              <button
                type="button"
                onClick={() => setAnalysisType("biweekly_14_day")}
                className={cn("rounded-full px-2.5 py-1 font-medium transition", analysisType === "biweekly_14_day" ? "bg-emerald-500 text-white" : "text-slate-500")}
              >
                14天
              </button>
            </div>
            <button
              type="button"
              onClick={handleGenerateInsight}
              disabled={generating || insightIsFromToday}
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {generating ? "生成中..." : insightIsFromToday ? "今日已更新" : "更新AI分析"}
            </button>
          </div>
        </div>

        {generateError && <p className="mb-2 text-xs text-rose-600">{generateError}</p>}

        {insight ? (
          <div className="flex flex-col gap-3 text-sm">
            {insight.medicalCaution && (
              <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600">⚠️ 建议优先关心顾客身体状况（非诊断，仅供参考）</p>
            )}
            <p className="text-slate-700">{insight.summary}</p>
            {insight.possibleFactors.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">可能相关因素</p>
                <ul className="flex flex-col gap-1 text-xs text-slate-600">
                  {insight.possibleFactors.map((f, i) => (
                    <li key={i}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {insight.positiveProgress.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">值得肯定</p>
                <ul className="flex flex-col gap-1 text-xs text-slate-600">
                  {insight.positiveProgress.map((f, i) => (
                    <li key={i}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {insight.coachFocus.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">跟进建议</p>
                <ul className="flex flex-col gap-1 text-xs text-slate-600">
                  {insight.coachFocus.map((f, i) => (
                    <li key={i}>· {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {insight.dataQuality === "limited" && <p className="text-xs text-slate-400">目前记录还不够完整，趋势仅供参考。</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-400">还没有生成过分析，点击「更新AI分析」生成本{periodDays}天摘要。</p>
        )}
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
              const avgDailyUsage = calcAverageDailyUsage(transactions, code);
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
        <StatCard label="打卡率" value={`${checkinRate}%`} icon="✅" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="连续打卡" value={journey?.streakDays ?? 0} unit="天" icon="🔥" accent="bg-amber-50 text-amber-600" />
        <StatCard label="当前体重" value={latestWeight ?? "—"} unit={latestWeight !== null ? "kg" : undefined} icon="⚖️" accent="bg-sky-50 text-sky-600" />
        <StatCard label="最后打卡" value={sortedCheckIns[0]?.date ?? "暂无记录"} accent="bg-slate-100 text-slate-500" />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-700">体重趋势</p>
        {weightTrendData.length > 0 ? (
          <TrendChart data={weightTrendData} unit="kg" strokeClass="text-emerald-500" fillId={`detail-weight-${customerId}`} />
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">还没有体重记录</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">今日饮食记录</p>
        {todayMeals.length === 0 ? (
          <EmptyState icon="🍽️" title="今天还没有饮食记录" />
        ) : (
          <div className="flex flex-col gap-2">
            {todayMeals.map((meal) => (
              <div key={meal.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">{meal.photoEmoji ?? "🍽️"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{meal.name}</p>
                  <p className="text-xs text-slate-400">
                    {meal.time} · {meal.calories}kcal
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">{meal.misuScore}分</span>
              </div>
            ))}
          </div>
        )}
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
