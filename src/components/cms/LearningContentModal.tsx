"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContentCardViewer } from "./ContentCardViewer";
import type { CmsContentCreationMode, CmsContentFields, CmsPosterMediaItem, CmsTemplateType } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

interface LearningContentModalProps {
  title: string;
  /** e.g. "Day 3" — combined with the live page position into the header line. */
  dayLabel?: string;
  contentCreationMode: CmsContentCreationMode;
  templateType: CmsTemplateType | null;
  fields: CmsContentFields;
  posterMedia: CmsPosterMediaItem[];
  posterDescription: string | null;
  posterAltText: string | null;
  onClose: () => void;
  /** Present only in "complete" mode (today's not-yet-finished content). When
   * omitted the modal is a read-only review: "我看完了" simply closes it, and no
   * completion is recorded. */
  onComplete?: () => void;
  completing?: boolean;
  /** Secondary action — closes this modal and takes the customer to the 学习
   * page's history section. Pure navigation: never touches completion state. */
  onOpenHistory?: () => void;
}

/** The learning READER — a structured lesson, not a long scrolling page.
 *
 * Layout is three fixed regions around one scroll area:
 *   header (title · Day · 第 X / Y 页)  ← always visible
 *   lesson body                          ← the ONLY thing that scrolls
 *   sticky nav (◀ 上一页 · dots · 下一页 ▶ / 我看完了) + 学习历史
 *
 * The reader owns the page index (it used to live inside PosterCardViewer,
 * which put the navigation *inside* the scroll area and left scrollTop
 * untouched between pages — so the next poster opened half-way down). Owning it
 * here lets the nav stay pinned and lets every page change reset the body to
 * the top, so each poster always starts at its title/main visual.
 *
 * Poster lessons page through their images. Template lessons keep their own
 * interactive card stepper (its gating is integral) but report position back
 * via onStepChange, so the header count and the scroll reset work there too. */
export function LearningContentModal({
  title,
  dayLabel,
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
  const isPoster = contentCreationMode === "poster_upload";
  const pages = useMemo(() => [...posterMedia].sort((a, b) => a.sortOrder - b.sortOrder), [posterMedia]);

  const [page, setPage] = useState(0);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [templateTotal, setTemplateTotal] = useState(1);
  const bodyRef = useRef<HTMLDivElement>(null);

  const totalPages = isPoster ? Math.max(1, pages.length) : templateTotal;
  const currentIndex = isPoster ? page : templateIndex;
  const isLastPage = currentIndex >= totalPages - 1;

  // Every page is a fresh reading page. The scroll container persists across
  // page changes, so without this reset its scrollTop carries over and drops the
  // customer into the middle of the next poster.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [currentIndex]);

  const handleStepChange = useCallback((index: number, total: number) => {
    setTemplateIndex(index);
    setTemplateTotal(total);
  }, []);

  // Review mode → "我看完了" just closes; nothing is recorded.
  const handleComplete = onComplete ?? onClose;
  const currentPoster = pages[page];
  const headerMeta = [dayLabel, `第 ${currentIndex + 1} / ${totalPages} 页`].filter(Boolean).join(" · ");

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
        {/* ── Header: lesson title + where you are in the lesson ── */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{headerMeta}</p>
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

        {/* ── Lesson body: the only scrollable region ── */}
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {isPoster ? (
            currentPoster ? (
              <div className="flex flex-col gap-3">
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                  {/* Full modal width, natural height, never cropped. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentPoster.fileUrl} alt={posterAltText ?? ""} className="w-full object-contain" />
                </div>
                {posterDescription && <p className="text-sm leading-relaxed text-slate-600">{posterDescription}</p>}
              </div>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-slate-400">这篇内容还没有上传海报</p>
            )
          ) : (
            <ContentCardViewer
              templateType={templateType!}
              fields={fields}
              onComplete={handleComplete}
              completing={completing}
              onStepChange={handleStepChange}
            />
          )}
        </div>

        {/* ── Sticky reader navigation (poster lessons) ── */}
        {isPoster && (
          <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 px-4 py-3">
            <div className="flex flex-1 justify-start">
              {page > 0 && (
                <button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition active:bg-slate-50"
                >
                  ◀ 上一页
                </button>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex shrink-0 items-center gap-1.5" aria-label={`第 ${page + 1} / ${totalPages} 页`}>
                {pages.map((_, i) => (
                  <span key={i} className={cn("h-2 rounded-full transition-all", i === page ? "w-4 bg-emerald-500" : "w-2 bg-slate-200")} />
                ))}
              </div>
            )}

            <div className="flex flex-1 justify-end">
              {isLastPage ? (
                <button
                  type="button"
                  disabled={completing}
                  onClick={handleComplete}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition active:bg-emerald-600 disabled:opacity-50"
                >
                  {completing ? "完成中..." : "我看完了"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition active:bg-emerald-600"
                >
                  下一页 ▶
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Secondary navigation, never competing with the reading flow ── */}
        {onOpenHistory && (
          <div className="shrink-0 border-t border-slate-100 px-4 py-2.5">
            <button
              type="button"
              onClick={onOpenHistory}
              className="w-full py-1.5 text-center text-sm font-medium text-slate-500 transition active:text-slate-700"
            >
              📚 学习历史 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
