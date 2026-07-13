"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { AIInsight, AnalysisType, AttentionFlag, DataQuality, FlagSeverity } from "./types";

type InsightRow = Database["public"]["Tables"]["customer_ai_insights"]["Row"];
type FlagRow = Database["public"]["Tables"]["customer_attention_flags"]["Row"];

function mapInsightRow(row: InsightRow): AIInsight {
  return {
    id: row.id,
    customerId: row.customer_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    analysisType: row.analysis_type as AnalysisType,
    summary: row.summary,
    possibleFactors: (row.possible_factors as string[] | null) ?? [],
    positiveProgress: (row.positive_progress as string[] | null) ?? [],
    coachFocus: (row.coach_focus as string[] | null) ?? [],
    customerMessage: row.customer_message,
    dataQuality: row.data_quality as DataQuality,
    medicalCaution: row.medical_caution,
    generatedAt: row.generated_at,
  };
}

function mapFlagRow(row: FlagRow): AttentionFlag {
  return {
    id: row.id,
    customerId: row.customer_id,
    flagType: row.flag_type,
    flagLabel: row.flag_label,
    severity: row.severity as FlagSeverity,
    sourceStartDate: row.source_start_date,
    sourceEndDate: row.source_end_date,
    isActive: row.is_active,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export async function getLatestCustomerInsight(customerId: string, analysisType: AnalysisType): Promise<AIInsight | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customer_ai_insights")
    .select("*")
    .eq("customer_id", customerId)
    .eq("analysis_type", analysisType)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapInsightRow(data) : undefined;
}

/** A day's insight is only ever generated once ("每位顾客每天最多生成一次") —
 * this checks the already-fetched latest row rather than issuing another
 * query. */
export function isInsightFromToday(insight: AIInsight | undefined): boolean {
  if (!insight) return false;
  return insight.generatedAt.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export async function getActiveAttentionFlags(customerId: string): Promise<AttentionFlag[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("customer_attention_flags").select("*").eq("customer_id", customerId).eq("is_active", true).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapFlagRow);
}

/** Batched lookup for a Coach's customer roster — same pattern as
 * getInventoryForCustomers / getCheckInsForCustomers. */
export async function getActiveAttentionFlagsForCustomers(customerIds: string[]): Promise<Record<string, AttentionFlag[]>> {
  if (customerIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase.from("customer_attention_flags").select("*").in("customer_id", customerIds).eq("is_active", true);
  if (error) throw error;
  const map: Record<string, AttentionFlag[]> = {};
  for (const row of (data ?? []).map(mapFlagRow)) {
    if (!map[row.customerId]) map[row.customerId] = [];
    map[row.customerId].push(row);
  }
  return map;
}

export async function getLatestInsightsForCustomers(customerIds: string[], analysisType: AnalysisType): Promise<Record<string, AIInsight>> {
  if (customerIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customer_ai_insights")
    .select("*")
    .in("customer_id", customerIds)
    .eq("analysis_type", analysisType)
    .order("generated_at", { ascending: false });
  if (error) throw error;
  const map: Record<string, AIInsight> = {};
  for (const row of data ?? []) {
    if (!map[row.customer_id]) map[row.customer_id] = mapInsightRow(row);
  }
  return map;
}
