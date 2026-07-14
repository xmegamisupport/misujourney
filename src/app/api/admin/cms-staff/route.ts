import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const CMS_ROLES = ["admin", "nutritionist", "trainer", "coach"] as const;
type CmsRole = (typeof CMS_ROLES)[number];

interface CreateStaffBody {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

interface UpdateRoleBody {
  userId?: string;
  role?: string;
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

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, name, avatar, role, created_at")
    .in("role", CMS_ROLES)
    .order("created_at", { ascending: false });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const result = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data: userData } = await admin.auth.admin.getUserById(p.id);
      return { id: p.id, name: p.name, avatar: p.avatar, role: p.role, email: userData.user?.email ?? null, createdAt: p.created_at };
    }),
  );

  return NextResponse.json({ users: result });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as CreateStaffBody;
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const role = body.role as CmsRole;

  if (!name) return NextResponse.json({ error: "请输入姓名" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "请输入邮箱" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "密码至少需要 6 位" }, { status: 400 });
  if (role !== "nutritionist" && role !== "trainer") {
    return NextResponse.json({ error: "只能在这里新增 Nutritionist 或 Trainer 账号" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { name },
  });

  if (createError || !created.user) {
    const message = createError?.message.includes("already been registered") ? "该邮箱已被注册" : "创建账号失败，请稍后再试";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // role must be set here explicitly — same reason as the Coach creation
  // route: admin.createUser() merges app_metadata in with a separate update
  // after the initial insert, so handle_new_user()'s AFTER INSERT trigger
  // never sees it.
  const { error: updateError } = await admin.from("profiles").update({ role }).eq("id", created.user.id);
  if (updateError) {
    return NextResponse.json({ error: `账号已创建，但设置角色失败：${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: { id: created.user.id, name, email, role } });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as UpdateRoleBody;
  const userId = body.userId;
  const role = body.role as CmsRole;

  if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  if (!CMS_ROLES.includes(role)) return NextResponse.json({ error: "无效的角色" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const { error: updateError } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
