"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { getCmsStaff, createStaffAccount, updateStaffRole } from "@/lib/cms/staff";
import type { CmsRole, CmsStaffUser } from "@/lib/cms/staff";

const ROLE_LABELS: Record<CmsRole, string> = {
  admin: "Admin",
  nutritionist: "Nutritionist",
  trainer: "Trainer",
  coach: "Coach",
  customer: "Customer",
};

const ASSIGNABLE_ROLES: CmsRole[] = ["admin", "nutritionist", "trainer"];

export default function CmsPermissionsPage() {
  const { user } = useAuthUser();
  const [staff, setStaff] = useState<CmsStaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"nutritionist" | "trainer">("nutritionist");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reloadTick, setReloadTick] = useState(0);
  const load = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    getCmsStaff()
      .then((data) => {
        if (!cancelled) setStaff(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("请输入姓名");
    if (!email.trim()) return setError("请输入邮箱");
    if (password.length < 6) return setError("密码至少需要 6 位");

    setSubmitting(true);
    const result = await createStaffAccount({ name: name.trim(), email: email.trim(), password, role });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "创建失败");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setFormOpen(false);
    load();
  }

  async function handleRoleChange(userId: string, newRole: CmsRole) {
    const result = await updateStaffRole(userId, newRole);
    if (result.ok) load();
  }

  if (!loading && user && user.role !== "admin") {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="权限管理" />
        <EmptyState icon="🔒" title="只有 Admin 可以查看权限管理" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="权限管理"
        subtitle={`共 ${staff.length} 位 CMS 用户`}
        action={
          <button type="button" onClick={() => setFormOpen((v) => !v)} className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-600">
            {formOpen ? "取消" : "+ 新增用户"}
          </button>
        }
      />

      {formOpen && (
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">新增 Nutritionist / Trainer 账号</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              姓名
              <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              邮箱
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              密码
              <input type="password" placeholder="至少 6 位" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              角色
              <select value={role} onChange={(e) => setRole(e.target.value as "nutritionist" | "trainer")} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                <option value="nutritionist">Nutritionist</option>
                <option value="trainer">Trainer</option>
              </select>
            </label>
          </div>
          {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
          <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
            {submitting ? "创建中..." : "创建账号"}
          </button>
        </form>
      )}

      {!loading && staff.length === 0 ? (
        <EmptyState icon="🔑" title="还没有 CMS 用户" />
      ) : (
        <div className="flex flex-col gap-2">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">{s.avatar ?? "🙂"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{s.name}</p>
                <p className="truncate text-xs text-slate-400">{s.email ?? "—"}</p>
              </div>
              <select
                value={s.role}
                onChange={(e) => handleRoleChange(s.id, e.target.value as CmsRole)}
                disabled={s.id === user?.id}
                className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 disabled:bg-slate-50 disabled:text-slate-400"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
