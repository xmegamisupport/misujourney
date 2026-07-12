import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountSettingsSection } from "@/components/AccountSettingsSection";
import { SignOutButton } from "@/components/SignOutButton";
import { currentCustomer, currentCoach } from "@/lib/mock-data";

const linkItems = [
  { href: "/customer/progress", label: "我的成长", icon: "📈" },
  { href: "/customer/coach", label: "我的 Journey Coach", icon: "🌿" },
  { href: "/customer/learn/guide", label: "产品使用指南", icon: "📦" },
  { href: "/customer/learn/faq", label: "常见问题", icon: "💬" },
];

const staticItems = [
  { label: "通知设置", icon: "🔔" },
  { label: "隐私政策", icon: "🔒" },
];

export default function CustomerProfilePage() {
  const c = currentCustomer;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="我的" />

      <div className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-sky-50 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
          {c.avatar}
        </span>
        <div>
          <p className="text-lg font-semibold text-slate-900">{c.name}</p>
          <p className="text-sm text-slate-500">
            Day {c.currentDay} / {c.planLength} · 教练：{currentCoach.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">{c.age}</p>
          <p className="text-xs text-slate-400">年龄</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">{c.height}cm</p>
          <p className="text-xs text-slate-400">身高</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">{c.currentWeight}kg</p>
          <p className="text-xs text-slate-400">当前体重</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {linkItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-sm text-slate-700 last:border-b-0 hover:bg-slate-50"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-slate-300">→</span>
          </Link>
        ))}
      </div>

      <AccountSettingsSection />

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {staticItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-sm text-slate-700 last:border-b-0"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <span className="text-slate-300">→</span>
          </div>
        ))}
      </div>

      <SignOutButton className="rounded-xl border border-rose-100 bg-rose-50 py-3 text-center text-sm font-semibold text-rose-500 transition hover:bg-rose-100" />
    </div>
  );
}
