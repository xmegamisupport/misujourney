export type CoachApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";

/** Applicant-facing view of one application (from get_my_coach_applications).
 * Never carries internal_note or reviewer identity. */
export interface MyCoachApplication {
  id: string;
  applicationNumber: number;
  resellerUsername: string;
  status: CoachApplicationStatus;
  rejectReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  createdAt: string;
}

/** Admin-facing view (from the service-role API route) — includes email/phone
 * from auth.users/profiles and the Admin-only internal note. */
export interface AdminCoachApplication {
  id: string;
  applicationNumber: number;
  applicantId: string;
  applicantName: string;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  resellerUsername: string;
  status: CoachApplicationStatus;
  rejectReason: string | null;
  internalNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  createdAt: string;
}

export interface MutationResult {
  ok: boolean;
  error?: string;
}

export const STATUS_LABEL: Record<CoachApplicationStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "未通过",
  withdrawn: "已撤回",
};

export const STATUS_STYLE: Record<CoachApplicationStatus, string> = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-emerald-50 text-emerald-600",
  rejected: "bg-rose-50 text-rose-600",
  withdrawn: "bg-slate-100 text-slate-500",
};

/** Human-readable application number, e.g. #000042. */
export function formatApplicationNumber(n: number): string {
  return `#${String(n).padStart(6, "0")}`;
}
