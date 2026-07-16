"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { WhatsAppContactEditor } from "@/components/WhatsAppContactEditor";
import { useAllCoaches } from "@/lib/coach/hooks";

/** Read-only roster of active Coaches. Coach capability is granted only via
 * Activate Coach on /admin/users (there is no separate Coach-account creation
 * anymore) — a Coach is a Customer account with is_coach = true. Per-coach
 * WhatsApp contact setup + customer binding remain here as management. */
export default function CoachManagementPage() {
  const { data: coaches, loading, refresh } = useAllCoaches();
  const [editingCoachId, setEditingCoachId] = useState<string | null>(null);

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
            <Link
              href="/admin/users"
              className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
            >
              开通教练权限
            </Link>
          </div>
        }
      />

      <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        教练是「顾客账号 + 教练权限」。要开通新的教练，请让对方先用普通注册流程创建账号，再到{" "}
        <Link href="/admin/users" className="font-medium text-emerald-600">
          用户管理
        </Link>{" "}
        为其开通教练权限。
      </p>

      {!loading && coaches.length === 0 ? (
        <EmptyState icon="🌿" title="还没有已开通的教练" description="到「用户管理」为某个账号开通教练权限即可。" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {coaches.map((coach) => {
            const isEditing = editingCoachId === coach.id;
            return (
              <div key={coach.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <Link href={`/admin/coaches/${coach.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-50 text-2xl">
                      {coach.avatar ?? "🌿"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 hover:text-violet-600">{coach.name}</p>
                      <p className="truncate text-xs text-slate-400">{coach.email ?? "—"}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {coach.customerCount} 位顾客 · 推荐码 {coach.referralCode ?? "—"} · WhatsApp{" "}
                        {coach.hasWhatsAppContact ? "已设置" : coach.whatsappNeedsReview ? "待确认（旧资料）" : "未设置"}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditingCoachId(isEditing ? null : coach.id)}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
                  >
                    {isEditing ? "收起" : "编辑 WhatsApp"}
                  </button>
                </div>

                {isEditing && (
                  <WhatsAppContactEditor
                    coachId={coach.id}
                    initial={{
                      countryIso: coach.whatsappCountryIso,
                      localNumber: coach.whatsappLocalNumber,
                      customLink: coach.whatsappCustomLink,
                      contactMethod: coach.whatsappContactMethod,
                      needsReview: coach.whatsappNeedsReview,
                    }}
                    onSaved={refresh}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
