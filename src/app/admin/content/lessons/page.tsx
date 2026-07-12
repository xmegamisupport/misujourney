import { PageHeader } from "@/components/ui/PageHeader";
import { ContentTabs } from "@/components/admin/ContentTabs";
import { lessons } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function LessonManagementPage() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader
        title="Lesson Management"
        subtitle={`共 ${lessons.length} 门课程`}
        action={
          <button type="button" className="rounded-xl bg-violet-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet-600">
            + 新增课程
          </button>
        }
      />

      <ContentTabs />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">课程名称</th>
              <th className="px-4 py-3 font-medium">分类</th>
              <th className="px-4 py-3 font-medium">时长</th>
              <th className="px-4 py-3 font-medium">观看次数</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr key={lesson.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">{lesson.title}</td>
                <td className="px-4 py-3 text-slate-500">{lesson.category}</td>
                <td className="px-4 py-3 text-slate-500">{lesson.duration}</td>
                <td className="px-4 py-3 text-slate-500">{lesson.views}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      lesson.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {lesson.status === "published" ? "已发布" : "草稿"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button type="button" className="text-xs font-medium text-violet-600">
                    编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
