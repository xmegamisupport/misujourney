"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySettings, useSchedule, useContentLibrary } from "@/lib/cms/hooks";
import { updateJourneySettings, setDaySchedule } from "@/lib/cms/engine";
import { TEMPLATE_LIST } from "@/lib/cms/templates";
import { CREATION_MODE_LABELS, CREATION_MODE_STYLES, STATUS_LABELS, STATUS_STYLES } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

function JourneySettingsPanel({ isAdmin }: { isAdmin: boolean }) {
  const { data: settings, loading, refresh } = useJourneySettings();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState(30);
  const [limit, setLimit] = useState<1 | 2 | 3>(1);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditor() {
    if (!settings) return;
    setName(settings.journeyName);
    setDays(settings.journeyDays);
    setLimit(settings.dailyContentLimit);
    setEnabled(settings.dailyContentEnabled);
    setOpen(true);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateJourneySettings({ journeyName: name, journeyDays: days, dailyContentLimit: limit, dailyContentEnabled: enabled });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "保存失败");
      return;
    }
    setOpen(false);
    refresh();
  }

  if (loading || !settings) return null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Journey 设置</p>
          <p className="mt-1 text-xs text-slate-400">
            {settings.journeyName} · 共 {settings.journeyDays} 天 · 每日内容上限 {settings.dailyContentLimit} 篇 · {settings.dailyContentEnabled ? "已启用" : "已停用"}
          </p>
        </div>
        {isAdmin && (
          <button type="button" onClick={openEditor} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-600">
            编辑
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            Journey 名称
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            Journey 天数
            <input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            每日内容上限
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value) as 1 | 2 | 3)} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
              <option value={1}>1篇</option>
              <option value={2}>2篇</option>
              <option value={3}>3篇</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            是否启用每日内容
          </label>
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={handleSave} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
              {saving ? "保存中..." : "保存设置"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JourneySchedulePage() {
  const { user } = useAuthUser();
  const isAdmin = user?.role === "admin";
  const { data: settings } = useJourneySettings();
  const { data: schedule, refresh: refreshSchedule } = useSchedule();
  const { data: library } = useContentLibrary();
  const [dayNumber, setDayNumber] = useState(1);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todaysEntries = useMemo(
    () => schedule.filter((e) => e.dayNumber === dayNumber).sort((a, b) => a.sortOrder - b.sortOrder),
    [schedule, dayNumber],
  );
  const limit = settings?.dailyContentLimit ?? 1;
  const atLimit = todaysEntries.length >= limit;

  async function handleRemove(contentId: string) {
    const remaining = todaysEntries.filter((e) => e.contentId !== contentId).map((e) => e.contentId);
    const result = await setDaySchedule(dayNumber, remaining);
    if (result.ok) refreshSchedule();
  }

  async function handleAdd(contentId: string) {
    setError(null);
    if (atLimit) {
      setError(`目前每日内容上限为${limit}篇，如需增加，请先到 Journey 设置修改。`);
      return;
    }
    const next = [...todaysEntries.map((e) => e.contentId), contentId];
    const result = await setDaySchedule(dayNumber, next);
    if (!result.ok) {
      setError(result.error ?? "操作失败");
      return;
    }
    setPicking(false);
    refreshSchedule();
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Journey 安排" subtitle="每位顾客每天只看到当天开放的内容" />

      <JourneySettingsPanel isAdmin={isAdmin} />

      <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <button type="button" onClick={() => setDayNumber((d) => Math.max(1, d - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
          ←
        </button>
        <div className="flex-1 text-center text-sm font-semibold text-slate-800">Day {dayNumber}</div>
        <button type="button" onClick={() => setDayNumber((d) => d + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
          →
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            这一天安排的内容（{todaysEntries.length}/{limit}）
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPicking(true);
              }}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              + 添加内容
            </button>
          )}
        </div>

        {error && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">{error}</div>}

        {todaysEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">这一天还没有安排内容</p>
        ) : (
          <div className="flex flex-col gap-2">
            {todaysEntries.map((entry) => {
              const template = TEMPLATE_LIST.find((t) => t.type === entry.content?.templateType);
              return (
                <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="text-lg">{entry.content?.contentCreationMode === "poster_upload" ? "🖼️" : (template?.icon ?? "📄")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{entry.content?.title ?? "（内容已删除）"}</p>
                    {entry.content && (
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLES[entry.content.status])}>
                          {STATUS_LABELS[entry.content.status]}
                        </span>
                        <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-medium", CREATION_MODE_STYLES[entry.content.contentCreationMode])}>
                          {CREATION_MODE_LABELS[entry.content.contentCreationMode]}
                        </span>
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <button type="button" onClick={() => handleRemove(entry.contentId)} className="shrink-0 text-xs font-medium text-rose-500">
                      移除
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {picking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center" onClick={() => setPicking(false)}>
          <div className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-lg md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 text-sm font-semibold text-slate-800">选择要加入 Day {dayNumber} 的内容</p>
            <p className="mb-3 text-xs text-slate-400">只能选择已发布的内容</p>
            <div className="flex flex-col gap-2">
              {(() => {
                const pickable = library.filter((item) => item.status === "published" && !todaysEntries.some((e) => e.contentId === item.id));
                if (pickable.length === 0) {
                  return <p className="py-6 text-center text-sm text-slate-400">目前没有可以安排的已发布内容</p>;
                }
                return pickable.map((item) => {
                  const template = TEMPLATE_LIST.find((t) => t.type === item.templateType);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAdd(item.id)}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-emerald-300"
                    >
                      <span className="text-lg">{item.contentCreationMode === "poster_upload" ? "🖼️" : template?.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                        <span className={cn("mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium", CREATION_MODE_STYLES[item.contentCreationMode])}>
                          {CREATION_MODE_LABELS[item.contentCreationMode]}
                        </span>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
