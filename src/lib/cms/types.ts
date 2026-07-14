import type { Enums } from "@/lib/supabase/database.types";

export type CmsContentCategory = Enums<"cms_content_category">;
export type CmsTemplateType = Enums<"cms_template_type">;
export type CmsContentStatus = Enums<"cms_content_status">;

export type CmsContentFields = Record<string, string>;

export interface CmsContentItem {
  id: string;
  title: string;
  category: CmsContentCategory;
  templateType: CmsTemplateType;
  fields: CmsContentFields;
  coverImageUrl: string | null;
  estimatedSeconds: number;
  status: CmsContentStatus;
  createdBy: string;
  createdByName?: string;
  reviewNote: string | null;
  submittedForReviewAt: string | null;
  submittedForReviewBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  unpublishedAt: string | null;
  contentVersion: number;
  parentContentId: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmsJourneySettings {
  journeyName: string;
  journeyDays: number;
  dailyContentLimit: 1 | 2 | 3;
  dailyContentEnabled: boolean;
  updatedAt: string;
}

export interface CmsScheduleEntry {
  id: string;
  dayNumber: number;
  contentId: string;
  sortOrder: number;
  content?: CmsContentItem;
}

export interface TodayContentItem {
  contentId: string;
  title: string;
  category: CmsContentCategory;
  templateType: CmsTemplateType;
  fields: CmsContentFields;
  coverImageUrl: string | null;
  estimatedSeconds: number;
  positionInDay: number;
  totalToday: number;
  completed: boolean;
}

export const CATEGORY_LABELS: Record<CmsContentCategory, string> = {
  nutrition_knowledge: "营养知识",
  life_tips: "生活技巧",
  misu_usage: "MISU使用",
  daily_challenge: "每日挑战",
};

export const STATUS_LABELS: Record<CmsContentStatus, string> = {
  draft: "草稿",
  pending_review: "等待审核",
  published: "已发布",
  needs_revision: "需要修改",
  unpublished: "已取消发布",
};

export const STATUS_STYLES: Record<CmsContentStatus, string> = {
  draft: "bg-slate-100 text-slate-500",
  pending_review: "bg-amber-50 text-amber-600",
  published: "bg-emerald-50 text-emerald-600",
  needs_revision: "bg-rose-50 text-rose-600",
  unpublished: "bg-slate-100 text-slate-400",
};
