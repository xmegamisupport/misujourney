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

/** Just name/phone/email for the "教练的顾客" list — profiles has no email
 * column (it lives on auth.users), so this still needs the admin client's
 * bulk listUsers() the same way /api/admin/coaches does, just scoped to one
 * coach's bound customers instead of every coach. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: coachId } = await params;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const [{ data: customers, error: custError }, { data: userList, error: userListError }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, name, phone")
      .eq("role", "customer")
      .eq("coach_id", coachId)
      .not("onboarding_completed_at", "is", null)
      .order("name", { ascending: true }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (custError) return NextResponse.json({ error: custError.message }, { status: 500 });
  if (userListError) return NextResponse.json({ error: userListError.message }, { status: 500 });

  const emailById = new Map(userList.users.map((u) => [u.id, u.email ?? null]));

  const result = (customers ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: emailById.get(c.id) ?? null,
  }));

  return NextResponse.json({ customers: result });
}
