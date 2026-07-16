"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/useAuthUser";

/** One-time welcome shown the first time a newly-activated Coach opens the
 * Coach Workspace. Gated on is_coach = true AND coach_welcome_ack_at is null,
 * so it appears exactly once and never again — the acknowledgement is
 * persisted server-side (survives refresh + other devices). */
export function CoachWelcomeGate() {
  const { user, loading } = useAuthUser();
  const [dismissed, setDismissed] = useState(false);

  if (loading || !user?.isCoach || user.coachWelcomeAckAt || dismissed) return null;

  async function acknowledge() {
    setDismissed(true); // hide immediately; persistence follows
    const supabase = createClient();
    await supabase.rpc("ack_coach_welcome");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-3xl">🎉</span>
        <p className="text-lg font-semibold text-slate-900">你的教练工作台已开启 🎉</p>
        <p className="mt-2 text-sm text-slate-500">现在你可以：</p>
        <ul className="mx-auto mt-3 flex max-w-[15rem] flex-col gap-1.5 text-left text-sm text-slate-600">
          <li>🌱 继续自己的 Journey</li>
          <li>❤️ 陪伴和查看你的顾客</li>
          <li>🔗 使用你的 Referral Registration Link</li>
        </ul>
        <button
          type="button"
          onClick={acknowledge}
          className="mt-6 w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
        >
          开始使用教练工作台
        </button>
      </div>
    </div>
  );
}
