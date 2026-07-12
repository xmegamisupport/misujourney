import Link from "next/link";
import type { DailyTask } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: DailyTask;
  href?: string;
}

export function TaskCard({ task, href }: TaskCardProps) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3.5 transition",
        task.done ? "border-emerald-100 bg-emerald-50/60" : "border-slate-100 bg-white hover:border-emerald-200",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
        {task.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", task.done ? "text-slate-500 line-through" : "text-slate-800")}>
          {task.title}
        </p>
        <p className="truncate text-xs text-slate-400">{task.description}</p>
      </div>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
          task.done ? "border-emerald-400 bg-emerald-400 text-white" : "border-slate-300 text-transparent",
        )}
      >
        ✓
      </span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
