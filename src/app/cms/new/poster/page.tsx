"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { ContentForm } from "@/components/cms/ContentForm";

export default function NewPosterContentPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="上传已设计好的海报" backHref="/cms" />
      <ContentForm creationMode="poster_upload" />
    </div>
  );
}
