"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNotifications } from "@/lib/notifications/hooks";
import { markNotificationRead, type AppNotification } from "@/lib/notifications/engine";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function CustomerNotificationsPage() {
  const { data: notifications, loading, refresh } = useNotifications();

  async function handleMarkRead(n: AppNotification) {
    if (n.readAt) return;
    await markNotificationRead(n.id);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      <PageHeader title="通知中心" backHref="/customer" />

      {!loading && notifications.length === 0 ? (
        <EmptyState icon="🔔" title="还没有通知" description="有新的消息时会显示在这里。" />
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "rounded-lg border p-4 shadow-elev1 transition",
                n.readAt ? "border-line bg-surface" : "border-brand-soft bg-brand-tint/50",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                  {n.type === "coach_application_approved" ? "🎉" : n.type === "coach_application_rejected" ? "📩" : "🔔"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    {!n.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-soft">{n.body}</p>
                  {n.rejectReason && (
                    <p className="mt-1 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-600">原因：{n.rejectReason}</p>
                  )}
                  <p className="mt-1.5 text-xs text-ink-faint">{formatDateTime(n.createdAt)}</p>

                  <div className="mt-3 flex items-center gap-2">
                    {n.actionHref && n.actionLabel && (
                      <a
                        href={n.actionHref}
                        onClick={() => handleMarkRead(n)}
                        className="rounded-full bg-gradient-to-br from-brand to-brand-deep px-3.5 py-1.5 text-xs font-semibold text-white shadow-brand transition duration-500 ease-soft hover:-translate-y-0.5"
                      >
                        {n.actionLabel}
                      </a>
                    )}
                    {!n.readAt && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n)}
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-canvas"
                      >
                        标为已读
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
