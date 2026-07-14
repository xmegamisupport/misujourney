"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { FaqForm } from "@/components/admin/FaqForm";
import { useFaqItem } from "@/lib/staticContent/hooks";

export default function EditFaqPage() {
  const params = useParams<{ id: string }>();
  const { data: faq, loading } = useFaqItem(params.id);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="编辑 FAQ" backHref="/admin/content/faq" />
      {!loading && !faq ? <EmptyState icon="🔍" title="找不到这条 FAQ" /> : faq ? <FaqForm existing={faq} /> : null}
    </div>
  );
}
