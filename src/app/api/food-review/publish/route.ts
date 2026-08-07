import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

const INBOX_IMAGE_BUCKET = "food-inbox-images";

/** Publish a Recognition Inbox item into the Food Library, then run the real
 * Phase-3.3 image cleanup: SQL decides which images are now over-cap, and this
 * route removes them from Storage (freeing the actual files) and drops the rows.
 * Reviewer-gated twice: here (fast 403) and inside food_inbox_publish (authoritative). */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: role } = await supabase.rpc("my_food_role");
  if (role !== "food_reviewer" && role !== "food_admin") {
    return NextResponse.json({ error: "需要 Food Reviewer 权限" }, { status: 403 });
  }

  let body: { missId?: string; overrides?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }
  if (!body.missId) return NextResponse.json({ error: "缺少 missId" }, { status: 400 });

  // 1) Publish via the existing reviewer RPC (creates/activates food + aliases +
  //    reviewed nutrition, marks the inbox item published).
  const { data: foodId, error } = await supabase.rpc("food_inbox_publish", {
    p_id: body.missId,
    p_overrides: (body.overrides ?? {}) as unknown as Json,
  });
  if (error || !foodId) {
    return NextResponse.json({ error: error?.message ?? "发布失败" }, { status: 400 });
  }

  // 2) Real image cleanup (Stage 4/5). SQL marks the over-cap images; we remove
  //    the files from Storage, then drop the metadata rows. Best-effort — a
  //    cleanup failure must never undo a successful publish.
  let imagesPruned = 0;
  try {
    const admin = createAdminClient();
    const { data: paths } = await admin.rpc("food_cleanup_food_images", { p_food_id: foodId as string });
    const toRemove = (paths as string[] | null) ?? [];
    if (toRemove.length > 0) {
      await admin.storage.from(INBOX_IMAGE_BUCKET).remove(toRemove);
      await admin.rpc("food_confirm_image_deleted", { p_paths: toRemove });
      imagesPruned = toRemove.length;
    }
  } catch {
    // Publish already succeeded; cleanup can be retried later.
  }

  return NextResponse.json({ foodId, imagesPruned });
}
