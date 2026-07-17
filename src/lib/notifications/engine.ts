"use client";

import { createClient } from "@/lib/supabase/client";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  rejectReason: string | null;
  actionLabel: string | null;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
}

/** The caller's notifications, newest first (RLS scopes to user_id = auth.uid()). */
export async function getMyNotifications(): Promise<AppNotification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, reject_reason, action_label, action_href, read_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    rejectReason: r.reject_reason,
    actionLabel: r.action_label,
    actionHref: r.action_href,
    readAt: r.read_at,
    createdAt: r.created_at,
  }));
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("mark_notification_read", { p_id: id });
}
