import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "只有 Admin 可以执行此操作" }, { status: 403 }) };
  }
  return { error: null };
}

const STATUS_ORDER: Record<string, number> = { pending: 0, approved: 1, rejected: 1, withdrawn: 2 };

/** Coach Application queue. Admin-only. Applicant email lives on auth.users
 * and the internal note must never reach a non-admin, so both are assembled
 * here behind the service role rather than exposed through client RLS. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const [{ data: apps, error: appsError }, { data: profiles, error: profError }, { data: userList, error: userListError }] = await Promise.all([
    admin
      .from("coach_applications")
      .select("id, application_number, applicant_id, reseller_username, status, reject_reason, internal_note, submitted_at, reviewed_at, reviewed_by, created_at")
      .order("submitted_at", { ascending: false }),
    admin.from("profiles").select("id, name, avatar, phone"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (appsError) return NextResponse.json({ error: appsError.message }, { status: 500 });
  if (profError) return NextResponse.json({ error: profError.message }, { status: 500 });
  if (userListError) return NextResponse.json({ error: userListError.message }, { status: 500 });

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const emailById = new Map(userList.users.map((u) => [u.id, u.email ?? null]));

  const result = (apps ?? [])
    .map((a) => {
      const applicant = profileById.get(a.applicant_id);
      return {
        id: a.id,
        applicationNumber: a.application_number,
        applicantId: a.applicant_id,
        applicantName: applicant?.name ?? "—",
        avatar: applicant?.avatar ?? null,
        email: emailById.get(a.applicant_id) ?? null,
        phone: applicant?.phone ?? null,
        resellerUsername: a.reseller_username,
        status: a.status,
        rejectReason: a.reject_reason,
        internalNote: a.internal_note,
        submittedAt: a.submitted_at,
        reviewedAt: a.reviewed_at,
        reviewedByName: a.reviewed_by ? (profileById.get(a.reviewed_by)?.name ?? null) : null,
        createdAt: a.created_at,
      };
    })
    // Default order: pending first, then newest first (the query already
    // ordered by submitted_at desc, so this stable sort just lifts pending).
    .sort((x, y) => (STATUS_ORDER[x.status] ?? 3) - (STATUS_ORDER[y.status] ?? 3));

  return NextResponse.json({ applications: result });
}
