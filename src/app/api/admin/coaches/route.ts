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

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  // profiles has no email column (it lives on auth.users). The 3 lookups
  // below are all independent of each other — parallelized instead of
  // sequential awaits, and the email lookup is one listUsers() call instead
  // of one getUserById() round trip per coach (the admin Auth API is
  // noticeably slower than a plain Postgrest query, so this matters more
  // than the query count does).
  const [{ data: coaches, error: coachError }, { data: customers, error: custError }, { data: userList, error: userListError }] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, name, avatar, referral_code, whatsapp_country_code, whatsapp_country_iso, whatsapp_local_number, whatsapp_contact_method, whatsapp_normalized_number, whatsapp_custom_link, whatsapp_needs_review, created_at, coach_activated_at",
      )
      // Coach identity is the is_coach capability; legacy role='coach' kept
      // transitionally.
      .or("is_coach.eq.true,role.eq.coach")
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("coach_id").eq("role", "customer").not("coach_id", "is", null).not("onboarding_completed_at", "is", null),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (coachError) return NextResponse.json({ error: coachError.message }, { status: 500 });
  if (custError) return NextResponse.json({ error: custError.message }, { status: 500 });
  if (userListError) return NextResponse.json({ error: userListError.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const row of customers ?? []) {
    if (row.coach_id) counts[row.coach_id] = (counts[row.coach_id] ?? 0) + 1;
  }
  const emailById = new Map(userList.users.map((u) => [u.id, u.email ?? null]));

  const result = (coaches ?? []).map((c) => {
    const hasWhatsAppContact = c.whatsapp_contact_method === "custom_link" ? Boolean(c.whatsapp_custom_link) : Boolean(c.whatsapp_normalized_number);
    return {
      id: c.id,
      name: c.name,
      avatar: c.avatar,
      email: emailById.get(c.id) ?? null,
      referralCode: c.referral_code,
      hasWhatsAppContact,
      whatsappCountryIso: c.whatsapp_country_iso,
      whatsappLocalNumber: c.whatsapp_local_number,
      whatsappCustomLink: c.whatsapp_custom_link,
      whatsappContactMethod: c.whatsapp_contact_method,
      whatsappNeedsReview: c.whatsapp_needs_review,
      customerCount: counts[c.id] ?? 0,
      createdAt: c.created_at,
    };
  });

  return NextResponse.json({ coaches: result });
}
