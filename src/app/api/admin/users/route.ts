import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const LISTED_ROLES = ["customer", "coach", "admin"] as const;

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

  const [{ data: profiles, error: profileError }, { data: userList, error: userListError }] = await Promise.all([
    admin.from("profiles").select("id, name, avatar, role, created_at").in("role", LISTED_ROLES).order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (userListError) return NextResponse.json({ error: userListError.message }, { status: 500 });

  const authUserById = new Map(userList.users.map((u) => [u.id, u]));

  const result = (profiles ?? []).map((p) => {
    const authUser = authUserById.get(p.id);
    // No suspend/ban feature exists yet, so "inactive" only reflects a real
    // banned_until in the future; "pending" means the email was never
    // confirmed (e.g. an invite that was never completed).
    const bannedUntil = authUser?.banned_until ? new Date(authUser.banned_until).getTime() : null;
    const status = bannedUntil && bannedUntil > Date.now() ? "inactive" : !authUser?.email_confirmed_at ? "pending" : "active";
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      email: authUser?.email ?? null,
      role: p.role,
      status,
      joinedAt: p.created_at,
    };
  });

  return NextResponse.json({ users: result });
}
