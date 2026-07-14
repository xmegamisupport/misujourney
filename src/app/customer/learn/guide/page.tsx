"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProductGuides } from "@/lib/staticContent/hooks";

export default function ProductGuidePage() {
  const { data: guides, loading } = useProductGuides();

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="产品使用指南" subtitle="了解你的 MISU 产品" backHref="/customer/learn" />

      {!loading && guides.length === 0 ? (
        <EmptyState icon="📦" title="暂无产品指南" />
      ) : (
        guides.map((guide) => (
          <div key={guide.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{guide.name}</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">
                {guide.category}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">{guide.summary}</p>
          </div>
        ))
      )}
    </div>
  );
}
