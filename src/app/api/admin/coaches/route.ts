import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface CreateCoachBody {
  name?: string;
  email?: string;
  password?: string;
  referralCode?: string;
}

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

function generateReferralCode(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "coach";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}${suffix}`;
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

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as CreateCoachBody;
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  let referralCode = body.referralCode?.trim().toLowerCase() || "";

  if (!name) return NextResponse.json({ error: "请输入教练姓名" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "请输入邮箱" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "密码至少需要 6 位" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  if (referralCode) {
    const { data: existing } = await admin.from("profiles").select("id").eq("referral_code", referralCode).maybeSingle();
    if (existing) return NextResponse.json({ error: "该推荐码已被使用" }, { status: 400 });
  } else {
    for (let i = 0; i < 5; i++) {
      const candidate = generateReferralCode(name);
      const { data: existing } = await admin.from("profiles").select("id").eq("referral_code", candidate).maybeSingle();
      if (!existing) {
        referralCode = candidate;
        break;
      }
    }
    if (!referralCode) return NextResponse.json({ error: "生成推荐码失败，请手动输入" }, { status: 500 });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "coach" },
    user_metadata: { name },
  });

  if (createError || !created.user) {
    const message = createError?.message.includes("already been registered") ? "该邮箱已被注册" : "创建账号失败，请稍后再试";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // role must be set here explicitly, not left to handle_new_user() alone:
  // admin.createUser() inserts the auth.users row first (default
  // app_metadata) and only merges in the custom app_metadata with a
  // separate update afterward, so the AFTER INSERT trigger never actually
  // sees role: 'coach' — confirmed live, not a hypothetical. WhatsApp contact
  // info is set up separately by the Coach themselves via update_coach_
  // whatsapp_contact() (which also supports Admin editing any Coach), since
  // it needs a country selector this creation form doesn't have.
  const { error: updateError } = await admin.from("profiles").update({ role: "coach", referral_code: referralCode }).eq("id", created.user.id);

  if (updateError) {
    return NextResponse.json({ error: `账号已创建，但设置推荐码失败：${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, coach: { id: created.user.id, name, email, referralCode } });
}
