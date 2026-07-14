import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface RegisterCoachBody {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  referralCode?: string;
}

const REFERRAL_CODE_PATTERN = /^[a-z0-9]{3,20}$/;

/** Deliberately public — no admin check, same trust level as customer
 * /register. Role still can't be client-forged: it's only ever set via
 * app_metadata through the service-role Admin API below, never trusted from
 * anything the caller sends directly (see handle_new_user()). */
export async function POST(request: Request) {
  const body = (await request.json()) as RegisterCoachBody;
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const phone = body.phone?.trim() ?? "";
  const referralCode = body.referralCode?.trim().toLowerCase() ?? "";

  if (!name) return NextResponse.json({ error: "请输入姓名" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "请输入邮箱" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "密码至少需要 6 位" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "请输入电话号码" }, { status: 400 });
  if (!REFERRAL_CODE_PATTERN.test(referralCode)) {
    return NextResponse.json({ error: "Reseller Username 只能使用 3-20 位英文字母或数字" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const { data: existingCode } = await admin.from("profiles").select("id").eq("referral_code", referralCode).maybeSingle();
  if (existingCode) {
    return NextResponse.json({ error: "该 Reseller Username 已被使用，请更换" }, { status: 400 });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "coach" },
    user_metadata: { name },
  });

  if (createError || !created.user) {
    const message = createError?.message.includes("already been registered") ? "该邮箱已被注册，请直接登录" : "注册失败，请稍后再试";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // role must be set here explicitly, not left to handle_new_user() alone:
  // admin.createUser() inserts the auth.users row first (default
  // app_metadata) and only merges in the custom app_metadata with a
  // separate update afterward, so the AFTER INSERT trigger never actually
  // sees role: 'coach' — confirmed live, not a hypothetical. referral_code
  // also has a unique DB constraint — if two people race for the same code,
  // roll back the just-created auth user rather than leaving an orphaned
  // coach account with no working referral code.
  const { error: updateError } = await admin.from("profiles").update({ role: "coach", referral_code: referralCode, phone }).eq("id", created.user.id);
  if (updateError) {
    await admin.auth.admin.deleteUser(created.user.id);
    const message = updateError.message.toLowerCase().includes("duplicate") ? "该 Reseller Username 已被使用，请更换" : "注册失败，请稍后再试";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
