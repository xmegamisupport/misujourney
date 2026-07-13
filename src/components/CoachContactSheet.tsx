"use client";

import { useMyCoachContact } from "@/lib/coach-contact/hooks";
import { WhatsAppContactButton } from "./WhatsAppContactButton";

interface CoachContactSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Coach contact lives behind this bottom sheet, not a full-width dashboard
 * card — the dashboard itself stays focused on today's tasks/progress/goal. */
export function CoachContactSheet({ open, onClose }: CoachContactSheetProps) {
  const { data: coachContact, loading } = useMyCoachContact();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-lg md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-semibold text-slate-900">我的 Journey Coach</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        {!loading && coachContact && (
          <div className="mb-5 flex flex-col items-center gap-2">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
              {coachContact.avatar || "🌿"}
            </span>
            <p className="text-base font-semibold text-slate-900">{coachContact.name}</p>
          </div>
        )}

        <WhatsAppContactButton coachContact={coachContact} loading={loading} />
      </div>
    </div>
  );
}
