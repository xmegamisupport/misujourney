"use client";

import { ContentCardViewer } from "./ContentCardViewer";
import { PosterCardViewer } from "./PosterCardViewer";
import type { CmsContentCreationMode, CmsContentFields, CmsPosterMediaItem, CmsTemplateType } from "@/lib/cms/types";

interface LearningContentModalProps {
  title: string;
  subtitle?: string;
  contentCreationMode: CmsContentCreationMode;
  templateType: CmsTemplateType | null;
  fields: CmsContentFields;
  posterMedia: CmsPosterMediaItem[];
  posterDescription: string | null;
  posterAltText: string | null;
  onClose: () => void;
  /** Present only in "complete" mode (today's not-yet-finished content). When
   * omitted the modal is a read-only review: the viewer's final button simply
   * closes it, and no completion is recorded. */
  onComplete?: () => void;
  completing?: boolean;
}

/** One modal shell + content viewer shared by every learning entry point — the
 * Dashboard "今日小知识" task, the 学习 centre's "今日内容", and its history — so
 * completed content is always reopenable and always renders identically.
 * "Completed" (a progress row) and "visible" (this modal) are separate: review
 * mode passes no onComplete, so opening finished content never hides or
 * re-records anything. */
export function LearningContentModal({
  title,
  subtitle,
  contentCreationMode,
  templateType,
  fields,
  posterMedia,
  posterDescription,
  posterAltText,
  onClose,
  onComplete,
  completing,
}: LearningContentModalProps) {
  // Review mode → the viewer's final button just closes the modal.
  const handleComplete = onComplete ?? onClose;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{title}</p>
          <button type="button" onClick={onClose} aria-label="关闭" className="shrink-0 text-slate-400">
            ✕
          </button>
        </div>
        {subtitle && <p className="mb-3 text-center text-xs text-slate-400">{subtitle}</p>}
        {contentCreationMode === "poster_upload" ? (
          <PosterCardViewer media={posterMedia} description={posterDescription} altText={posterAltText} onComplete={handleComplete} completing={completing} />
        ) : (
          <ContentCardViewer templateType={templateType!} fields={fields} onComplete={handleComplete} completing={completing} />
        )}
      </div>
    </div>
  );
}
