"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { WhatsAppContactMethod } from "@/lib/whatsapp";
import { calculateCurrentDay } from "@/lib/journey";
import { getGoalPlansForCustomers } from "@/lib/goals/engine";
import { getCheckInsForCustomers, getTodayMealsForCustomers, getInventoryForCustomers } from "@/lib/inventory/engine";
import { getInventoryAlertStatus, combineAlertStatuses } from "@/lib/inventory/constants";
import type { InventoryAlertStatus } from "@/lib/inventory/types";

const DEFAULT_PLAN_LENGTH = 30;

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
 * needed beyond role, since a coach can't see anyone else's profiles here.
 * onboarding_completed_at excludes registrations that were never finished —
 * coach_id itself is only set by complete_registration_goals(), so this is
 * mostly defensive, but keeps the rule in one place regardless of how a
 * customer ended up with a coach_id. */
export async function getMyCustomers(coachId: string): Promise<CoachCustomerSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, avatar, start_date, phone")
    .eq("coach_id", coachId)
    .eq("role", "customer")
    .not("onboarding_completed_at", "is", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, avatar: row.avatar, startDate: row.start_date, phone: row.phone }));
}

export interface AdminCustomerSummary {
  id: string;
  name: string;
  avatar: string | null;
  coachId: string | null;
  coachName: string | null;
  currentDay: number;
  planLength: number;
  checkinRate: number;
  todayMisuScore: number;
  stockStatus: InventoryAlertStatus | null;
}

/** Admin-wide roster (every customer, not just one coach's) — used by
 * /admin/customers and /admin/binding. RLS (profiles_select_as_admin)
 * already scopes every query below to what an admin is allowed to see.
 * onboarding_completed_at excludes registrations that were never finished —
 * an abandoned signup shouldn't show up as a real customer until the 5-step
 * onboarding wizard actually completes. */
export async function getAllCustomersForAdmin(): Promise<AdminCustomerSummary[]> {
  const supabase = createClient();
  const { data: customers, error } = await supabase
    .from("profiles")
    .select("id, name, avatar, start_date, coach_id")
    .eq("role", "customer")
    .not("onboarding_completed_at", "is", null)
    .order("name", { ascending: true });
  if (error) throw error;
  if (!customers || customers.length === 0) return [];

  const customerIds = customers.map((c) => c.id);
  const coachIds = [...new Set(customers.map((c) => c.coach_id).filter((id): id is string => id !== null))];

  const [coachRows, goalPlanMap, checkInMap, todayMealsMap, inventoryMap] = await Promise.all([
    coachIds.length > 0 ? supabase.from("profiles").select("id, name").in("id", coachIds).then((r) => r.data ?? []) : Promise.resolve([]),
    getGoalPlansForCustomers(customerIds),
    getCheckInsForCustomers(customerIds),
    getTodayMealsForCustomers(customerIds),
    getInventoryForCustomers(customerIds),
  ]);
  const coachNameMap = new Map(coachRows.map((c) => [c.id, c.name]));

  return customers.map((c) => {
    const planLength = goalPlanMap[c.id]?.journeyDays ?? DEFAULT_PLAN_LENGTH;
    const currentDay = Math.min(calculateCurrentDay(c.start_date), planLength);
    const checkIns = checkInMap[c.id] ?? [];
    const checkinRate = currentDay > 0 ? Math.min(100, Math.round((checkIns.length / currentDay) * 100)) : 0;
    const todayMeals = todayMealsMap[c.id] ?? [];
    const todayMisuScore = todayMeals.length > 0 ? Math.round(todayMeals.reduce((sum, m) => sum + m.misuScore, 0) / todayMeals.length) : 0;
    const inventoryRows = inventoryMap[c.id] ?? [];
    const stockStatus = inventoryRows.length > 0 ? combineAlertStatuses(inventoryRows.map((r) => getInventoryAlertStatus(r.remainingUnits))) : null;

    return {
      id: c.id,
      name: c.name,
      avatar: c.avatar,
      coachId: c.coach_id,
      coachName: c.coach_id ? (coachNameMap.get(c.coach_id) ?? null) : null,
      currentDay,
      planLength,
      checkinRate,
      todayMisuScore,
      stockStatus,
    };
  });
}

export interface SetCustomerCoachResult {
  ok: boolean;
  error?: string;
}

/** The only way to change a customer's negotiated coach — profiles has no
 * admin-wide UPDATE grant, so this goes through admin_set_customer_coach(),
 * which also validates the target is actually a customer/coach pair. */
export async function setCustomerCoach(customerId: string, coachId: string | null): Promise<SetCustomerCoachResult> {
  const supabase = createClient();
  // The generator types p_coach_id as non-null uuid since Postgres doesn't
  // expose nullability for plain params — it's genuinely nullable server-side
  // (passing null clears the assignment), hence the cast.
  const { error } = await supabase.rpc("admin_set_customer_coach", { p_customer_id: customerId, p_coach_id: coachId } as { p_customer_id: string; p_coach_id: string });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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

export interface CoachBoundCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

/** The "教练的顾客" list only needs contact info — name/phone/email — not
 * the full progress roster. Admin-only, goes through /api/admin/coaches/[id]/
 * customers since email lives on auth.users. */
export async function getCoachBoundCustomers(coachId: string): Promise<CoachBoundCustomer[]> {
  const res = await fetch(`/api/admin/coaches/${coachId}/customers`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "加载顾客名单失败");
  return body.customers as CoachBoundCustomer[];
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
