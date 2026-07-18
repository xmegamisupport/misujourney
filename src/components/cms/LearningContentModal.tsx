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
  /** Secondary action — closes this modal and takes the customer to the 学习
   * page's history section. Pure navigation: never touches completion state. */
  onOpenHistory?: () => void;
}

/** One modal shell + content viewer shared by every learning entry point — the
 * Dashboard "今日小知识" task, the 学习 centre's "今日内容", and its history — so
 * completed content is always reopenable and always renders identically.
 *
 * Mobile-first near-full-screen sheet: ~92vw x ~86dvh with safe-area padding, a
 * fixed header (title + close) and footer (学习历史) around a scrollable body, so
 * the learning poster gets almost the whole screen, is never cropped
 * (object-contain at full modal width) and scrolls when taller than the sheet.
 *
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
  onOpenHistory,
}: LearningContentModalProps) {
  // Review mode → the viewer's final button just closes the modal.
  const handleComplete = onComplete ?? onClose;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-[4vw]"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
      }}
      onClick={onClose}
    >
      <div
        className="flex h-[86dvh] max-h-full w-[92vw] max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stays put so the close button is always reachable. */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition active:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content — the poster/cards use the full modal width. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {contentCreationMode === "poster_upload" ? (
            <PosterCardViewer
              media={posterMedia}
              description={posterDescription}
              altText={posterAltText}
              onComplete={handleComplete}
              completing={completing}
              fill
            />
          ) : (
            <ContentCardViewer templateType={templateType!} fields={fields} onComplete={handleComplete} completing={completing} />
          )}
        </div>

        {/* Secondary action, always visible under the content. The primary
            "我看完了 / 完成" button belongs to the viewer above (it drives the
            multi-card / multi-poster flow), so this stacks beneath it. */}
        {onOpenHistory && (
          <div className="shrink-0 border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={onOpenHistory}
              className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition active:bg-slate-50"
            >
              学习历史
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
