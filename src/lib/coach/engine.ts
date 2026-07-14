"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { WhatsAppContactMethod } from "@/lib/whatsapp";

export interface CoachCustomerSummary {
  id: string;
  name: string;
  avatar: string | null;
  startDate: string | null;
  phone: string | null;
}

export interface MyCoachProfile {
  id: string;
  name: string;
  avatar: string | null;
  referralCode: string | null;
  whatsappCountryCode: string | null;
  whatsappCountryIso: string | null;
  whatsappLocalNumber: string | null;
  whatsappNormalizedNumber: string | null;
  whatsappCustomLink: string | null;
  whatsappContactMethod: WhatsAppContactMethod;
  whatsappNeedsReview: boolean;
}

export async function getMyCoachProfile(coachId: string): Promise<MyCoachProfile | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, avatar, referral_code, whatsapp_country_code, whatsapp_country_iso, whatsapp_local_number, whatsapp_normalized_number, whatsapp_custom_link, whatsapp_contact_method, whatsapp_needs_review",
    )
    .eq("id", coachId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return {
    id: data.id,
    name: data.name,
    avatar: data.avatar,
    referralCode: data.referral_code,
    whatsappCountryCode: data.whatsapp_country_code,
    whatsappCountryIso: data.whatsapp_country_iso,
    whatsappLocalNumber: data.whatsapp_local_number,
    whatsappNormalizedNumber: data.whatsapp_normalized_number,
    whatsappCustomLink: data.whatsapp_custom_link,
    whatsappContactMethod: data.whatsapp_contact_method as WhatsAppContactMethod,
    whatsappNeedsReview: data.whatsapp_needs_review,
  };
}

export interface UpdateWhatsAppContactInput {
  coachId: string;
  countryCode: string;
  countryIso: string;
  localNumber: string;
  customLink: string;
  contactMethod: WhatsAppContactMethod;
}

export interface UpdateWhatsAppResult {
  ok: boolean;
  error?: string;
}

/** The only way to change a Coach's structured WhatsApp contact info —
 * profiles has no direct UPDATE grant for authenticated. The RPC allows the
 * caller to edit their own row, or any Coach's row if the caller is an
 * Admin — same function serves both self-edit and future Admin-edit UI. */
export async function updateCoachWhatsAppContact(input: UpdateWhatsAppContactInput): Promise<UpdateWhatsAppResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_coach_whatsapp_contact", {
    p_coach_id: input.coachId,
    p_whatsapp_country_code: input.countryCode,
    p_whatsapp_country_iso: input.countryIso,
    p_whatsapp_local_number: input.localNumber,
    p_whatsapp_custom_link: input.customLink,
    p_whatsapp_contact_method: input.contactMethod,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface CoachCustomerProfile extends CoachCustomerSummary {
  age: number | null;
  height: number | null;
  gender: string | null;
  phone: string | null;
  dietType: Database["public"]["Enums"]["diet_type"] | null;
  activityLevel: Database["public"]["Enums"]["activity_level"] | null;
}

/** RLS (profiles_select_as_coach: coach_id = auth.uid()) already scopes this
 * to exactly the customers assigned to the caller — no extra filtering
 * needed beyond role, since a coach can't see anyone else's profiles here. */
export async function getMyCustomers(coachId: string): Promise<CoachCustomerSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("id, name, avatar, start_date, phone").eq("coach_id", coachId).eq("role", "customer").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, avatar: row.avatar, startDate: row.start_date, phone: row.phone }));
}

export interface AdminCoachSummary {
  id: string;
  name: string;
  avatar: string | null;
  email: string | null;
  referralCode: string | null;
  hasWhatsAppContact: boolean;
  whatsappCountryIso: string | null;
  whatsappLocalNumber: string | null;
  whatsappCustomLink: string | null;
  whatsappContactMethod: WhatsAppContactMethod;
  whatsappNeedsReview: boolean;
  customerCount: number;
  createdAt: string;
}

/** Admin-only — goes through /api/admin/coaches since email lives on
 * auth.users (not readable via the normal RLS-scoped client) and listing it
 * needs the service-role Admin API. */
export async function getAllCoaches(): Promise<AdminCoachSummary[]> {
  const res = await fetch("/api/admin/coaches");
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "加载教练列表失败");
  return body.coaches as AdminCoachSummary[];
}

export interface CreateCoachInput {
  name: string;
  email: string;
  password: string;
  referralCode?: string;
}

export interface CreateCoachResult {
  ok: boolean;
  error?: string;
  coach?: { id: string; name: string; email: string; referralCode: string };
}

/** The only way to create a Coach account — auth.users can't be written via
 * a plain RPC, so this goes through the service-role Admin API on the
 * server (/api/admin/coaches), gated on the caller already being an admin. */
export async function createCoachAccount(input: CreateCoachInput): Promise<CreateCoachResult> {
  const res = await fetch("/api/admin/coaches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) return { ok: false, error: body.error ?? "创建失败" };
  return { ok: true, coach: body.coach };
}

export interface RegisterCoachInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  referralCode: string;
}

export interface RegisterCoachResult {
  ok: boolean;
  error?: string;
}

/** Public self-service Coach registration (the /register "MISU Coach"
 * path). Account creation happens server-side via the service-role Admin
 * API (/api/auth/register-coach) since role must go through app_metadata,
 * not anything the client sends — then this signs the browser in with the
 * same credentials so registration and login happen in one step. */
export async function registerCoachAccount(input: RegisterCoachInput): Promise<RegisterCoachResult> {
  const res = await fetch("/api/auth/register-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) return { ok: false, error: body.error ?? "注册失败" };

  const supabase = createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (signInError) return { ok: false, error: "账号已创建，但自动登录失败，请前往登录页手动登录" };
  return { ok: true };
}

export async function getCustomerProfile(customerId: string): Promise<CoachCustomerProfile | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", customerId).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return {
    id: data.id,
    name: data.name,
    avatar: data.avatar,
    startDate: data.start_date,
    age: data.age,
    height: data.height,
    gender: data.gender,
    phone: data.phone,
    dietType: data.diet_type,
    activityLevel: data.activity_level,
  };
}
