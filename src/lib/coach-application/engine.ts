"use client";

import { createClient } from "@/lib/supabase/client";
import type { AdminCoachApplication, MutationResult, MyCoachApplication } from "./types";

// ---------- Applicant side (RLS-safe RPCs) ----------

/** The caller's own application history, newest first. Goes through the
 * SECURITY DEFINER RPC, which omits the Admin-only internal note. */
export async function getMyCoachApplications(): Promise<MyCoachApplication[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_coach_applications");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    applicationNumber: r.application_number,
    resellerUsername: r.reseller_username,
    status: r.status,
    rejectReason: r.reject_reason,
    submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at,
    createdAt: r.created_at,
  }));
}

export async function submitCoachApplication(resellerUsername: string): Promise<MutationResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("submit_coach_application", { p_reseller_username: resellerUsername });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function withdrawCoachApplication(applicationId: string): Promise<MutationResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("withdraw_coach_application", { p_application_id: applicationId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------- Admin side ----------

/** Admin dashboard reminder count. */
export async function getPendingCoachApplicationCount(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("count_pending_coach_applications");
  if (error) throw error;
  return data ?? 0;
}

/** Full queue — goes through the service-role API since email lives on
 * auth.users and the internal note must only ever leave the server for an
 * authenticated Admin. */
export async function getCoachApplicationsForAdmin(): Promise<AdminCoachApplication[]> {
  const res = await fetch("/api/admin/coach-applications");
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "加载申请列表失败");
  return body.applications as AdminCoachApplication[];
}

export async function getCoachApplicationForAdmin(id: string): Promise<AdminCoachApplication | null> {
  const res = await fetch(`/api/admin/coach-applications/${id}`);
  const body = await res.json();
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(body.error ?? "加载申请失败");
  return body.application as AdminCoachApplication;
}

export async function approveCoachApplication(id: string, internalNote?: string): Promise<MutationResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("approve_coach_application", {
    p_application_id: id,
    p_internal_note: internalNote?.trim() ? internalNote.trim() : undefined,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function rejectCoachApplication(id: string, rejectReason: string, internalNote?: string): Promise<MutationResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("reject_coach_application", {
    p_application_id: id,
    p_reject_reason: rejectReason,
    p_internal_note: internalNote?.trim() ? internalNote.trim() : undefined,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateApplicationInternalNote(id: string, note: string): Promise<MutationResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_application_internal_note", { p_application_id: id, p_internal_note: note });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** The customer's single effective state for the My Account card. isCoach
 * (already active, e.g. via direct Admin activation) always reads as approved;
 * otherwise the latest application drives it — a withdrawn latest reads as
 * "not applied" so the customer can simply apply again. */
export function deriveCardState(
  isCoach: boolean,
  applications: MyCoachApplication[],
): { kind: "not_applied" | "pending" | "approved" | "rejected"; application: MyCoachApplication | null } {
  if (isCoach) return { kind: "approved", application: applications.find((a) => a.status === "approved") ?? null };
  const latest = applications[0] ?? null; // already sorted newest-first
  if (!latest || latest.status === "withdrawn") return { kind: "not_applied", application: null };
  if (latest.status === "pending") return { kind: "pending", application: latest };
  if (latest.status === "approved") return { kind: "approved", application: latest };
  return { kind: "rejected", application: latest };
}
