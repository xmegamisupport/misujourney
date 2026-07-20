"use client";

import { PageHeader } from "@/components/ui/PageHeader";

/** 🥗 好物 Healthy Picks — reserved, not built.
 *
 * This slot used to be 饮食, a second door into meal logging that the Dashboard
 * already owned. It now answers a different question: not "what did I eat?" but
 * "what should I buy?" — the supermarket, the convenience store, the menu.
 *
 * The page is deliberately a real placeholder rather than a hidden route: the
 * tab has to exist for the navigation to settle into its final shape, and a
 * customer who taps it deserves to know what is coming rather than meeting a
 * dead end. Nothing here is fetched, so it costs nothing to ship early. */

const COMING = [
  { icon: "🛒", label: "超市好物" },
  { icon: "🍞", label: "面包推荐" },
  { icon: "🍜", label: "健康面食" },
  { icon: "🍦", label: "冰淇淋推荐" },
  { icon: "🥤", label: "健康饮料" },
  { icon: "🍽️", label: "餐厅点餐指南" },
  { icon: "🏪", label: "便利店推荐" },
  { icon: "🌱", label: "MISU 搭配组合" },
];

export default function HealthyPicksPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pb-8 md:px-8">
      <PageHeader title="🥗 好物 Healthy Picks" subtitle="外面的世界，也可以吃得好一点" />

      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 px-5 py-8 text-center">
        <p className="text-3xl">🥗</p>
        <p className="mt-3 text-base font-semibold text-slate-800">即将推出</p>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
          这里不是用来记录你吃了什么，而是帮你在超市、便利店和餐厅里，更容易找到值得吃的东西。
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-700">我们正在准备</p>
        <div className="grid grid-cols-2 gap-2">
          {COMING.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-3"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="min-w-0 truncate text-xs font-medium text-slate-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="px-2 text-center text-xs leading-relaxed text-slate-400">
        想先看到哪一个？告诉你的 Journey Coach。
      </p>
    </div>
  );
}
