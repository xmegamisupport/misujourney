"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { usePublishedContent } from "@/lib/cms/hooks";
import { setContentPublished } from "@/lib/cms/engine";
import { CATEGORY_LABELS } from "@/lib/cms/types";
import { TEMPLATE_LIST } from "@/lib/cms/templates";

export default function PublishedContentPage() {
  const { user } = useAuthUser();
  const isAdmin = user?.role === "admin";
  const { data: items, loading, refresh } = usePublishedContent();

  async function handleUnpublish(id: string) {
    const result = await setContentPublished(id, false);
    if (result.ok) refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="已发布" subtitle={`共 ${items.length} 篇上线中`} />

      {!loading && items.length === 0 ? (
        <EmptyState icon="✅" title="目前还没有已发布的内容" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => {
            const template = TEMPLATE_LIST.find((t) => t.type === item.templateType);
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">{template?.icon ?? "📄"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{CATEGORY_LABELS[item.category]} · {template?.label}</p>
                  {isAdmin && (
                    <div className="mt-2 flex gap-2">
                      <Link href={`/cms/content/${item.id}`} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-emerald-300">
                        编辑
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleUnpublish(item.id)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-rose-500 hover:border-rose-300"
                      >
                        取消发布
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
