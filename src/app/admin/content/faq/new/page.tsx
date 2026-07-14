import { PageHeader } from "@/components/ui/PageHeader";
import { FaqForm } from "@/components/admin/FaqForm";

export default function NewFaqPage() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="新增 FAQ" backHref="/admin/content/faq" />
      <FaqForm />
    </div>
  );
}
