import { redirect } from "next/navigation";

/** Lesson Management is retired — the Knowledge CMS replaced it as the
 * single source of truth for customer-facing content. */
export default function LessonManagementPage() {
  redirect("/cms");
}
