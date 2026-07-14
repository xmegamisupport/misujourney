"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useFaqs } from "@/lib/staticContent/hooks";

export default function FaqPage() {
  const { data: faqs, loading } = useFaqs();

  return (
    <div className="flex flex-col gap-3 px-4 pb-8 md:px-8">
      <PageHeader title="常见问题" subtitle="快速找到答案" backHref="/customer/learn" />

      {!loading && faqs.length === 0 ? (
        <EmptyState icon="💬" title="暂无常见问题" />
      ) : (
        faqs.map((faq) => (
          <details
            key={faq.id}
            className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm open:border-emerald-200"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-slate-800">
              {faq.question}
              <span className="shrink-0 text-slate-400 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm text-slate-500">{faq.answer}</p>
          </details>
        ))
      )}
    </div>
  );
}
