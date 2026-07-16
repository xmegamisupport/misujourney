import { redirect } from "next/navigation";

/** Legacy referral entry point. The referral experience now lives entirely on
 * /register?ref=<code> (validated + auto-bound), so this route just forwards —
 * preserving any previously shared /join/<code> links. */
export default async function ReferralJoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/register?ref=${encodeURIComponent(code)}`);
}
