"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentForm } from "@/components/cms/ContentForm";
import { useContentItem } from "@/lib/cms/hooks";

export default function EditContentPage() {
  const params = useParams<{ id: string }>();
  const { data: content, loading } = useContentItem(params.id);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="编辑内容" backHref="/cms" />
      {!loading && !content ? (
        <EmptyState icon="🔍" title="找不到这篇内容" />
      ) : content ? (
        <ContentForm templateType={content.templateType ?? undefined} existing={content} />
      ) : null}
    </div>
  );
}
