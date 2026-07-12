import { PageHeader } from "@/components/ui/PageHeader";
import { ContentTabs } from "@/components/admin/ContentTabs";
import { faqs } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function FaqManagementPage() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader
        title="FAQ Management"
        subtitle={`共 ${faqs.length} 条常见问题`}
        action={
          <button type="button" className="rounded-xl bg-violet-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet-600">
            + 新增 FAQ
          </button>
        }
      />

      <ContentTabs />

      <div className="flex flex-col gap-2">
        {faqs.map((faq) => (
          <div key={faq.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{faq.question}</p>
                <p className="mt-1 text-sm text-slate-500">{faq.answer}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  faq.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500",
                )}
              >
                {faq.status === "published" ? "已发布" : "草稿"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] text-violet-600">{faq.category}</span>
              <button type="button" className="text-xs font-medium text-violet-600">
                编辑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
