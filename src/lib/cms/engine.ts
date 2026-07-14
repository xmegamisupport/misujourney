"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { CmsContentCategory, CmsContentFields, CmsContentItem, CmsJourneySettings, CmsScheduleEntry, CmsTemplateType, TodayContentItem } from "./types";

type ContentRow = Database["public"]["Tables"]["cms_content_items"]["Row"] & { creator?: { name: string } | null };

function mapContentRow(row: ContentRow): CmsContentItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    templateType: row.template_type,
    fields: (row.fields as unknown as CmsContentFields) ?? {},
    coverImageUrl: row.cover_image_url,
    estimatedSeconds: row.estimated_seconds,
    status: row.status,
    createdBy: row.created_by,
    createdByName: row.creator?.name,
    reviewNote: row.review_note,
    submittedForReviewAt: row.submitted_for_review_at,
    submittedForReviewBy: row.submitted_for_review_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    unpublishedAt: row.unpublished_at,
    contentVersion: row.content_version,
    parentContentId: row.parent_content_id,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const CONTENT_SELECT_WITH_CREATOR = "*, creator:profiles!created_by(name)";

export interface CmsResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

export async function getContentLibrary(): Promise<CmsContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("cms_content_items").select(CONTENT_SELECT_WITH_CREATOR).order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ContentRow[]).map(mapContentRow);
}

export async function getContentById(id: string): Promise<CmsContentItem | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase.from("cms_content_items").select(CONTENT_SELECT_WITH_CREATOR).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapContentRow(data as unknown as ContentRow) : undefined;
}

export async function getPendingContent(): Promise<CmsContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cms_content_items")
    .select(CONTENT_SELECT_WITH_CREATOR)
    .eq("status", "pending_review")
    .order("submitted_for_review_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as ContentRow[]).map(mapContentRow);
}

export async function getPublishedContent(): Promise<CmsContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("cms_content_items").select(CONTENT_SELECT_WITH_CREATOR).eq("status", "published").order("published_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ContentRow[]).map(mapContentRow);
}

export interface CreateContentInput {
  title: string;
  category: CmsContentCategory;
  templateType: CmsTemplateType;
  fields: CmsContentFields;
  coverImageUrl?: string;
  estimatedSeconds: number;
}

/** Direct insert (not an RPC) — RLS (cms_content_insert_creator) already
 * enforces role in (nutritionist, trainer, admin) and created_by = auth.uid(),
 * same "RLS does the real enforcement" pattern used everywhere else. */
export async function createContent(customerId: string, input: CreateContentInput): Promise<CmsResult<CmsContentItem>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cms_content_items")
    .insert({
      title: input.title,
      category: input.category,
      template_type: input.templateType,
      fields: input.fields as never,
      cover_image_url: input.coverImageUrl || null,
      estimated_seconds: input.estimatedSeconds,
      created_by: customerId,
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: mapContentRow(data) };
}

export async function updateContent(id: string, input: CreateContentInput, updatedBy: string): Promise<CmsResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("cms_content_items")
    .update({
      title: input.title,
      category: input.category,
      template_type: input.templateType,
      fields: input.fields as never,
      cover_image_url: input.coverImageUrl || null,
      estimated_seconds: input.estimatedSeconds,
      updated_by: updatedBy,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function submitContentForReview(contentId: string): Promise<CmsResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("submit_content_for_review", { p_content_id: contentId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function reviewContent(contentId: string, approve: boolean, reviewNote?: string): Promise<CmsResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("review_content", { p_content_id: contentId, p_approve: approve, p_review_note: reviewNote });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** The only way to "edit" published content — clones it into a new draft
 * (parent_content_id set) rather than mutating the live row; RLS blocks
 * direct UPDATEs to published rows entirely, so this is the sole path in. */
export async function createRevisionDraft(contentId: string): Promise<CmsResult<{ id: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_revision_draft", { p_content_id: contentId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data as string } };
}

export async function setContentPublished(contentId: string, published: boolean): Promise<CmsResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_content_published", { p_content_id: contentId, p_published: published });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getJourneySettings(): Promise<CmsJourneySettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cms_journey_settings")
    .select("*")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .single();
  if (error) throw error;
  return {
    journeyName: data.journey_name,
    journeyDays: data.journey_days,
    dailyContentLimit: data.daily_content_limit as 1 | 2 | 3,
    dailyContentEnabled: data.daily_content_enabled,
    updatedAt: data.updated_at,
  };
}

export async function updateJourneySettings(settings: {
  journeyName: string;
  journeyDays: number;
  dailyContentLimit: 1 | 2 | 3;
  dailyContentEnabled: boolean;
}): Promise<CmsResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_journey_settings", {
    p_journey_name: settings.journeyName,
    p_journey_days: settings.journeyDays,
    p_daily_content_limit: settings.dailyContentLimit,
    p_daily_content_enabled: settings.dailyContentEnabled,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getSchedule(): Promise<CmsScheduleEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cms_journey_schedule")
    .select("*, cms_content_items(*)")
    .order("day_number", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    dayNumber: row.day_number,
    contentId: row.content_id,
    sortOrder: row.sort_order,
    content: row.cms_content_items ? mapContentRow(row.cms_content_items as ContentRow) : undefined,
  }));
}

export async function setDaySchedule(dayNumber: number, contentIds: string[]): Promise<CmsResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_day_schedule", { p_day_number: dayNumber, p_content_ids: contentIds });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getMyTodayContent(): Promise<TodayContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_today_content");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    contentId: row.content_id,
    title: row.title,
    category: row.category,
    templateType: row.template_type,
    fields: (row.fields as unknown as CmsContentFields) ?? {},
    coverImageUrl: row.cover_image_url,
    estimatedSeconds: row.estimated_seconds,
    positionInDay: row.position_in_day,
    totalToday: row.total_today,
    completed: row.completed,
  }));
}

export async function completeTodayContent(contentId: string): Promise<CmsResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("complete_today_content", { p_content_id: contentId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
