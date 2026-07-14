"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";

export type AdminUserStatus = "active" | "inactive" | "pending";

export interface AdminUserRow {
  id: string;
  name: string;
  avatar: string | null;
  email: string | null;
  role: Role;
  status: AdminUserStatus;
  joinedAt: string;
}

/** Admin-only — goes through /api/admin/users since email/confirmation/ban
 * state live on auth.users, same pattern as /api/admin/coaches. Scoped to
 * customer/coach/admin only; Nutritionist/Trainer accounts are managed on
 * the CMS's own 权限管理 page. */
export async function getAllUsersForAdmin(): Promise<AdminUserRow[]> {
  const res = await fetch("/api/admin/users");
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "加载用户列表失败");
  return body.users as AdminUserRow[];
}

export function useAllUsersForAdmin(): { data: AdminUserRow[]; loading: boolean } {
  const [data, setData] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAllUsersForAdmin()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
