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

/** One application for the Admin review page — includes email/phone and the
 * Admin-only internal note (service role; never exposed to the applicant). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const { data: a, error: appError } = await admin
    .from("coach_applications")
    .select("id, application_number, applicant_id, reseller_username, status, reject_reason, internal_note, submitted_at, reviewed_at, reviewed_by, created_at")
    .eq("id", id)
    .maybeSingle();
  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });
  if (!a) return NextResponse.json({ error: "找不到该申请" }, { status: 404 });

  const ids = [a.applicant_id, a.reviewed_by].filter((v): v is string => v !== null);
  const [{ data: profiles, error: profError }, { data: authUser, error: authError }] = await Promise.all([
    admin.from("profiles").select("id, name, avatar, phone").in("id", ids),
    admin.auth.admin.getUserById(a.applicant_id),
  ]);
  if (profError) return NextResponse.json({ error: profError.message }, { status: 500 });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const applicant = profileById.get(a.applicant_id);

  const application = {
    id: a.id,
    applicationNumber: a.application_number,
    applicantId: a.applicant_id,
    applicantName: applicant?.name ?? "—",
    avatar: applicant?.avatar ?? null,
    email: authUser?.user?.email ?? null,
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

  return NextResponse.json({ application });
}
