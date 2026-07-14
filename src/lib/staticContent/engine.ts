"use client";

import { createClient } from "@/lib/supabase/client";
import type { FaqItem, ProductGuideItem, StaticContentStatus } from "./types";

export interface StaticContentResult {
  ok: boolean;
  error?: string;
  id?: string;
}

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string;
  status: string;
}

interface GuideRow {
  id: string;
  name: string;
  category: string;
  summary: string;
  status: string;
}

function mapFaqRow(row: FaqRow): FaqItem {
  return { id: row.id, question: row.question, answer: row.answer, category: row.category, status: row.status as StaticContentStatus };
}

function mapGuideRow(row: GuideRow): ProductGuideItem {
  return { id: row.id, name: row.name, category: row.category, summary: row.summary, status: row.status as StaticContentStatus };
}

/** RLS (faq_items_select) already scopes this to published rows for anyone,
 * plus drafts for Admin — no extra status filtering needed here, so the
 * same function serves both /admin/content/faq and /customer/learn/faq. */
export async function getFaqs(): Promise<FaqItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("faq_items").select("id, question, answer, category, status").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapFaqRow);
}

export async function getFaqById(id: string): Promise<FaqItem | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase.from("faq_items").select("id, question, answer, category, status").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapFaqRow(data) : undefined;
}

export interface FaqInput {
  question: string;
  answer: string;
  category: string;
  status: StaticContentStatus;
}

export async function createFaq(input: FaqInput, userId: string): Promise<StaticContentResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faq_items")
    .insert({ question: input.question, answer: input.answer, category: input.category, status: input.status, created_by: userId, updated_by: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function updateFaq(id: string, input: FaqInput, userId: string): Promise<StaticContentResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("faq_items")
    .update({ question: input.question, answer: input.answer, category: input.category, status: input.status, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Same "published rows for everyone, drafts for Admin only" RLS pattern as
 * getFaqs() — serves both /admin/content/guide and /customer/learn/guide. */
export async function getProductGuides(): Promise<ProductGuideItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("product_guides").select("id, name, category, summary, status").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapGuideRow);
}

export async function getProductGuideById(id: string): Promise<ProductGuideItem | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase.from("product_guides").select("id, name, category, summary, status").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapGuideRow(data) : undefined;
}

export interface ProductGuideInput {
  name: string;
  category: string;
  summary: string;
  status: StaticContentStatus;
}

export async function createProductGuide(input: ProductGuideInput, userId: string): Promise<StaticContentResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_guides")
    .insert({ name: input.name, category: input.category, summary: input.summary, status: input.status, created_by: userId, updated_by: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function updateProductGuide(id: string, input: ProductGuideInput, userId: string): Promise<StaticContentResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("product_guides")
    .update({ name: input.name, category: input.category, summary: input.summary, status: input.status, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
