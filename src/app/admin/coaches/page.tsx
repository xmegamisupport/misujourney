"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAllCoaches } from "@/lib/coach/hooks";
import { createCoachAccount } from "@/lib/coach/engine";

export default function CoachManagementPage() {
  const { data: coaches, loading, refresh } = useAllCoaches();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setReferralCode("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) return setError("请输入教练姓名");
    if (!email.trim()) return setError("请输入邮箱");
    if (password.length < 6) return setError("密码至少需要 6 位");

    setSubmitting(true);
    const result = await createCoachAccount({
      name: name.trim(),
      email: email.trim(),
      password,
      referralCode: referralCode.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.ok || !result.coach) {
      setError(result.error ?? "创建失败，请稍后再试");
      return;
    }

    setSuccess(`已创建教练账号「${result.coach.name}」，推荐码：${result.coach.referralCode}`);
    resetForm();
    setFormOpen(false);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader
        title="Coach Management"
        subtitle={`共 ${coaches.length} 位教练`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/binding"
              className="rounded-xl border border-violet-200 px-3.5 py-2 text-xs font-medium text-violet-600 transition hover:bg-violet-50"
            >
              顾客绑定管理
            </Link>
            <button
              type="button"
              onClick={() => {
                setFormOpen((v) => !v);
                setError(null);
              }}
              className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
            >
              {formOpen ? "取消" : "+ 新增教练"}
            </button>
          </div>
        }
      />

      {success && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">新增教练账号</p>
          <p className="text-xs text-slate-400">WhatsApp 联络资料由教练登录后自行到「我的」页面设置（需要选择国家/地区）</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              姓名
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              邮箱
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              密码
              <input
                type="password"
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600 md:col-span-2">
              推荐码（选填，留空自动生成）
              <input
                type="text"
                placeholder="顾客注册时绑定这位教练要用的代码"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>

          {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-xl bg-emerald-500 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {submitting ? "创建中..." : "创建教练账号"}
          </button>
        </form>
      )}

      {!loading && coaches.length === 0 && !formOpen ? (
        <EmptyState icon="🌿" title="还没有教练账号" description="点击右上角「+ 新增教练」创建第一位教练" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {coaches.map((coach) => (
            <div key={coach.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-50 text-2xl">
                {coach.avatar ?? "🌿"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{coach.name}</p>
                <p className="truncate text-xs text-slate-400">{coach.email ?? "—"}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {coach.customerCount} 位顾客 · 推荐码 {coach.referralCode ?? "—"} · WhatsApp{" "}
                  {coach.hasWhatsAppContact ? "已设置" : coach.whatsappNeedsReview ? "待确认（旧资料）" : "未设置"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
