"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CmsContentCategory,
  CmsContentCreationMode,
  CmsContentFields,
  CmsContentItem,
  CmsJourneySettings,
  CmsPosterMediaItem,
  CmsScheduleEntry,
  CmsTemplateType,
  TodayContentItem,
} from "./types";

type MediaRow = Database["public"]["Tables"]["cms_content_media"]["Row"];
type ContentRow = Database["public"]["Tables"]["cms_content_items"]["Row"] & {
  creator?: { name: string } | null;
  poster_media?: MediaRow[] | null;
};

function mapMediaRow(row: MediaRow): CmsPosterMediaItem {
  return {
    id: row.id,
    fileUrl: row.file_url,
    sortOrder: row.sort_order,
    width: row.width,
    height: row.height,
    aspectRatio: row.aspect_ratio,
    fileSize: row.file_size,
  };
}

function mapContentRow(row: ContentRow): CmsContentItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    contentCreationMode: row.content_creation_mode as CmsContentCreationMode,
    templateType: row.template_type,
    fields: (row.fields as unknown as CmsContentFields) ?? {},
    coverImageUrl: row.cover_image_url,
    estimatedSeconds: row.estimated_seconds,
    posterDescription: row.poster_description,
    posterAltText: row.poster_alt_text,
    internalNote: row.internal_note,
    posterMedia: (row.poster_media ?? []).map(mapMediaRow).sort((a, b) => a.sortOrder - b.sortOrder),
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

const CONTENT_SELECT_WITH_CREATOR = "*, creator:profiles!created_by(name), poster_media:cms_content_media(*)";

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
      content_creation_mode: "template",
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

export interface PosterMediaInput {
  fileUrl: string;
  width: number | null;
  height: number | null;
  aspectRatio: string | null;
  fileSize: number | null;
}

export interface CreatePosterContentInput {
  title: string;
  category: CmsContentCategory;
  media: PosterMediaInput[];
  posterDescription?: string;
  posterAltText?: string;
  internalNote?: string;
  estimatedSeconds: number;
}

function mediaRowsFor(contentId: string, media: PosterMediaInput[]) {
  return media.map((m, i) => ({
    content_id: contentId,
    media_type: "poster_image",
    file_url: m.fileUrl,
    sort_order: i,
    width: m.width,
    height: m.height,
    aspect_ratio: m.aspectRatio,
    file_size: m.fileSize,
  }));
}

/** poster_upload's minimal form: title/category/poster images only — no
 * Template Engine fields, no separate cover image (the poster itself is
 * both). Two inserts (content row, then its media rows) since Postgres has
 * no "insert parent + children" single statement; if the media insert fails
 * the orphaned draft content row is harmless (still just an empty draft the
 * creator can re-open and re-upload into). */
export async function createPosterContent(customerId: string, input: CreatePosterContentInput): Promise<CmsResult<CmsContentItem>> {
  const supabase = createClient();
  const { data: content, error } = await supabase
    .from("cms_content_items")
    .insert({
      title: input.title,
      category: input.category,
      content_creation_mode: "poster_upload",
      template_type: null,
      fields: {} as never,
      cover_image_url: null,
      estimated_seconds: input.estimatedSeconds,
      poster_description: input.posterDescription || null,
      poster_alt_text: input.posterAltText || null,
      internal_note: input.internalNote || null,
      created_by: customerId,
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  if (input.media.length > 0) {
    const { error: mediaError } = await supabase.from("cms_content_media").insert(mediaRowsFor(content.id, input.media));
    if (mediaError) return { ok: false, error: mediaError.message };
  }

  const created = await getContentById(content.id);
  return created ? { ok: true, data: created } : { ok: true, data: mapContentRow(content) };
}

/** Replaces the poster's media list wholesale (delete-all-then-reinsert)
 * rather than diffing — the V1 UI only supports appending/removing whole
 * images, never reordering an existing row in place, so there's nothing a
 * diff would preserve that a clean replace doesn't already give correctly. */
export async function updatePosterContent(id: string, input: CreatePosterContentInput, updatedBy: string): Promise<CmsResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("cms_content_items")
    .update({
      title: input.title,
      category: input.category,
      estimated_seconds: input.estimatedSeconds,
      poster_description: input.posterDescription || null,
      poster_alt_text: input.posterAltText || null,
      internal_note: input.internalNote || null,
      updated_by: updatedBy,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  const { error: deleteError } = await supabase.from("cms_content_media").delete().eq("content_id", id);
  if (deleteError) return { ok: false, error: deleteError.message };

  if (input.media.length > 0) {
    const { error: mediaError } = await supabase.from("cms_content_media").insert(mediaRowsFor(id, input.media));
    if (mediaError) return { ok: false, error: mediaError.message };
  }

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
    contentCreationMode: row.content_creation_mode as CmsContentCreationMode,
    templateType: row.template_type,
    fields: (row.fields as unknown as CmsContentFields) ?? {},
    coverImageUrl: row.cover_image_url,
    estimatedSeconds: row.estimated_seconds,
    posterDescription: row.poster_description,
    posterAltText: row.poster_alt_text,
    // the RPC's poster_media jsonb is built with jsonb_build_object using
    // these exact camelCase keys already — no snake_case mapping needed here
    // (unlike mapContentRow's poster_media, which comes from a real table row).
    posterMedia: ((row.poster_media as unknown as CmsPosterMediaItem[]) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
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
