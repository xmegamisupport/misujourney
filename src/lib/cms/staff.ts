"use client";

import type { Enums } from "@/lib/supabase/database.types";

export type CmsRole = Enums<"user_role">;

export interface CmsStaffUser {
  id: string;
  name: string;
  avatar: string | null;
  role: CmsRole;
  email: string | null;
  createdAt: string;
}

export interface CmsResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

/** Admin-only — goes through /api/admin/cms-staff since email lives on
 * auth.users, same pattern as /api/admin/coaches. */
export async function getCmsStaff(): Promise<CmsStaffUser[]> {
  const res = await fetch("/api/admin/cms-staff");
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "加载用户列表失败");
  return body.users as CmsStaffUser[];
}

export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
  role: "nutritionist" | "trainer";
}

export async function createStaffAccount(input: CreateStaffInput): Promise<CmsResult<{ id: string }>> {
  const res = await fetch("/api/admin/cms-staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) return { ok: false, error: body.error ?? "创建失败" };
  return { ok: true, data: body.user };
}

export async function updateStaffRole(userId: string, role: CmsRole): Promise<CmsResult> {
  const res = await fetch("/api/admin/cms-staff", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, role }),
  });
  const body = await res.json();
  if (!res.ok) return { ok: false, error: body.error ?? "更新失败" };
  return { ok: true };
}
