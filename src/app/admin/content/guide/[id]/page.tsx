"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductGuideForm } from "@/components/admin/ProductGuideForm";
import { useProductGuideItem } from "@/lib/staticContent/hooks";

export default function EditProductGuidePage() {
  const params = useParams<{ id: string }>();
  const { data: guide, loading } = useProductGuideItem(params.id);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="编辑产品指南" backHref="/admin/content/guide" />
      {!loading && !guide ? <EmptyState icon="🔍" title="找不到这项产品指南" /> : guide ? <ProductGuideForm existing={guide} /> : null}
    </div>
  );
}
