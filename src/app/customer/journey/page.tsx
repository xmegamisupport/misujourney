"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

/** ✨ The gamification section — reserved, not themed.
 *
 * This slot used to be 学习, which now lives on the Dashboard. It is being held
 * for the reward layer built on top of Journey Points: levels, badges, a garden
 * that grows, streak rewards. The founder has NOT settled the theme or the name
 * yet, so this page deliberately does not commit to one — no "Journey", no
 * "Garden", nothing that would then clash with the daily Journey already on the
 * Dashboard. It is an honest placeholder.
 *
 * The one concrete thing that exists today — Journey Points — is not re-explained
 * here; it has its own guide in My Account, and the running total already shows
 * in the Dashboard header. This page only promises what is coming. */

const TEASERS = [
  { icon: "🌱", label: "秘密花园" },
  { icon: "🏅", label: "等级与徽章" },
  { icon: "🎁", label: "奖励兑换" },
  { icon: "🔥", label: "坚持奖励" },
];

export default function JourneyComingSoonPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pb-8 md:px-8">
      <PageHeader title="✨ 即将推出" subtitle="你的每一次坚持，之后都会有意义" />

      <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-sky-50 px-5 py-9 text-center">
        <p className="text-4xl">✨</p>
        <p className="mt-3 text-base font-semibold text-slate-800">正在准备中</p>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
          你在 Journey 里完成的每一件小事，都会累积成 Journey Points。之后，这些积分会变成看得见的成长。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {TEASERS.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-3.5">
            <span className="text-lg">{item.icon}</span>
            <span className="min-w-0 truncate text-sm font-medium text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* The one part of this section that is real today. */}
      <Link
        href="/customer/points-guide"
        className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 transition hover:border-emerald-200"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg">🌱</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">Journey Points 是怎么运作的？</p>
          <p className="mt-0.5 text-xs text-slate-400">看看每天可以怎么累积</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-emerald-600">查看 →</span>
      </Link>
    </div>
  );
}
