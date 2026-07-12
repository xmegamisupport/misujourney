import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { currentCustomer } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const courseList = [
  { title: "第 1 课：认识你的身体", duration: "8 分钟", status: "done" as const },
  { title: "第 12 课：外食怎么选", duration: "6 分钟", status: "done" as const },
  { title: "第 18 课：如何应对聚餐", duration: "6 分钟", status: "current" as const },
  { title: "第 25 课：突破停滞期", duration: "10 分钟", status: "locked" as const },
  { title: "第 30 课：维持期的心态调整", duration: "7 分钟", status: "locked" as const },
];

const statusMap = {
  done: { label: "已完成", cls: "bg-emerald-50 text-emerald-600" },
  current: { label: "进行中", cls: "bg-sky-50 text-sky-600" },
  locked: { label: "未开始", cls: "bg-slate-100 text-slate-400" },
};

export default function LearnPage() {
  const c = currentCustomer;
  const doneCount = courseList.filter((l) => l.status === "done").length;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="学习中心" subtitle={`Day ${c.currentDay} · 持续学习，持续进步`} />

      <ProgressCard
        label="课程完成进度"
        percent={Math.round((doneCount / courseList.length) * 100)}
        icon="📚"
        sublabel={`已完成 ${doneCount}/${courseList.length} 课`}
        barColor="bg-sky-500"
        trackColor="bg-sky-100"
      />

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/customer/learn/guide"
          className="flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 transition hover:border-emerald-300"
        >
          <span className="text-2xl">📦</span>
          <p className="text-sm font-semibold text-slate-800">产品使用指南</p>
          <p className="text-xs text-slate-500">了解你的 MISU 产品</p>
        </Link>
        <Link
          href="/customer/learn/faq"
          className="flex flex-col gap-2 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 transition hover:border-sky-300"
        >
          <span className="text-2xl">💬</span>
          <p className="text-sm font-semibold text-slate-800">常见问题</p>
          <p className="text-xs text-slate-500">快速找到答案</p>
        </Link>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50 p-4">
        <p className="mb-1 text-xs font-medium text-sky-600">今日推荐</p>
        <p className="text-base font-semibold text-slate-900">第 18 课：如何应对聚餐</p>
        <p className="mt-1 text-sm text-slate-500">学会在社交场合也能坚持健康饮食的小技巧</p>
        <button
          type="button"
          className="mt-3 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
        >
          开始学习
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">全部课程</p>
        <div className="flex flex-col gap-2">
          {courseList.map((lesson) => (
            <div
              key={lesson.title}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm"
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm",
                  statusMap[lesson.status].cls,
                )}
              >
                {lesson.status === "done" ? "✓" : "▶"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{lesson.title}</p>
                <p className="text-xs text-slate-400">{lesson.duration}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium", statusMap[lesson.status].cls)}>
                {statusMap[lesson.status].label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
