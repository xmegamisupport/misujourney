"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn("h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-violet-500" : "bg-slate-200")}
    >
      <span
        className={cn(
          "block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-[22px]",
        )}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [plan60, setPlan60] = useState(true);
  const [plan90, setPlan90] = useState(true);
  const [notifyStall, setNotifyStall] = useState(true);
  const [notifyNoCheckin, setNotifyNoCheckin] = useState(true);
  const [notifyStock, setNotifyStock] = useState(false);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="Settings" subtitle="平台基础设置" />

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">平台信息</p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            平台名称
            <input
              defaultValue="MISU Journey"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-slate-600">
            品牌标语
            <input
              defaultValue="Every Day Is A New Journey"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">品牌主色</p>
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="h-9 w-9 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-slate-400">浅绿色</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="h-9 w-9 rounded-full bg-sky-400" />
            <span className="text-[11px] text-slate-400">浅蓝色</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="h-9 w-9 rounded-full bg-violet-400" />
            <span className="text-[11px] text-slate-400">管理端强调色</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">计划设置</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">开放 60 天计划</span>
            <Toggle checked={plan60} onChange={setPlan60} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">开放 90 天计划</span>
            <Toggle checked={plan90} onChange={setPlan90} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">异常提醒通知</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">体重停滞提醒</span>
            <Toggle checked={notifyStall} onChange={setNotifyStall} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">连续未打卡提醒</span>
            <Toggle checked={notifyNoCheckin} onChange={setNotifyNoCheckin} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">产品库存不足提醒</span>
            <Toggle checked={notifyStock} onChange={setNotifyStock} />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition hover:bg-violet-600"
      >
        保存设置
      </button>
    </div>
  );
}
