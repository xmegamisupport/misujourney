import { PageHeader } from "@/components/ui/PageHeader";
import { ProductGuideForm } from "@/components/admin/ProductGuideForm";

export default function NewProductGuidePage() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="新增产品指南" backHref="/admin/content/guide" />
      <ProductGuideForm />
    </div>
  );
}
