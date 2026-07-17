"use client";

import Link from "next/link";
import { useUnreadNotificationCount } from "@/lib/notifications/hooks";

/** Header entry point to the Notification Center with an unread badge. */
export function NotificationBell() {
  const { count } = useUnreadNotificationCount();
  return (
    <Link
      href="/customer/notifications"
      aria-label="通知中心"
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-lg"
    >
      🔔
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
