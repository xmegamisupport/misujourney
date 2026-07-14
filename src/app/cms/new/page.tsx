"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentForm } from "@/components/cms/ContentForm";
import { TEMPLATES } from "@/lib/cms/templates";
import type { CmsTemplateType } from "@/lib/cms/types";

function NewContentContent() {
  const searchParams = useSearchParams();
  const templateParam = searchParams.get("template") as CmsTemplateType | null;
  const template = templateParam && TEMPLATES[templateParam];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="新增内容" backHref="/cms" />
      {template ? <ContentForm templateType={template.type} /> : <EmptyState icon="🤔" title="请先选择内容版型" description="回到内容库点击「+ 新增内容」" />}
    </div>
  );
}

export default function NewContentPage() {
  return (
    <Suspense fallback={null}>
      <NewContentContent />
    </Suspense>
  );
}
