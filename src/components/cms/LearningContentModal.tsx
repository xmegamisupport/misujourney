"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildCards } from "@/lib/cms/templates";
import type { CmsContentCreationMode, CmsContentFields, CmsPosterMediaItem, CmsTemplateType } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { TemplateCardPage } from "./TemplateCardPage";

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

/** THE Learning Reader — the single reading experience for every lesson in MISU
 * Journey. A poster lesson and a template lesson differ only in what a page
 * *contains*; the reader around them is identical:
 *
 *   header (title · Day · 第 X / Y 页)   ← always visible
 *   lesson body                           ← the ONLY thing that scrolls
 *   sticky nav (◀ 上一页 · dots · 下一页 ▶ / 我看完了)
 *   📚 学习历史 →
 *
 * The reader owns the page index for BOTH types (poster images and template
 * cards are both just "pages"), so navigation position, the page indicator and
 * the scroll-reset-on-page-change behave the same everywhere. Interactive
 * template cards gate 下一页/我看完了 until the customer answers — the answer is
 * held here too, and cleared on every page change. */
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

  const posters = useMemo(() => [...posterMedia].sort((a, b) => a.sortOrder - b.sortOrder), [posterMedia]);
  const cards = useMemo(() => (!isPoster && templateType ? buildCards(templateType, fields) : []), [isPoster, templateType, fields]);

  const pageCount = isPoster ? posters.length : cards.length;
  const totalPages = Math.max(1, pageCount);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Every page is a fresh reading page. The scroll container persists across
  // page changes, so without this reset its scrollTop carries over and the
  // customer lands in the middle of the next page.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [index]);

  /** Turn to a page: the answer belongs to the page being left, so it's cleared
   * here (in the event) rather than in an effect. */
  function goToPage(next: number) {
    setIndex(next);
    setSelected(null);
  }

  const currentPoster = isPoster ? posters[index] : undefined;
  const currentCard = !isPoster ? cards[index] : undefined;
  const isLastPage = index >= totalPages - 1;
  // Interactive cards must be answered before moving on / finishing.
  const canAdvance = !currentCard?.interactive || selected !== null;

  // Review mode → "我看完了" just closes; nothing is recorded.
  const handleComplete = onComplete ?? onClose;
  const headerMeta = [dayLabel, `第 ${index + 1} / ${totalPages} 页`].filter(Boolean).join(" · ");

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
          ) : currentCard ? (
            <TemplateCardPage card={currentCard} selected={selected} onSelect={setSelected} pageKey={index} />
          ) : (
            <p className="px-4 py-10 text-center text-sm text-slate-400">内容还没有填写完整</p>
          )}
        </div>

        {/* ── Sticky reader navigation — identical for every lesson type ── */}
        <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 px-4 py-3">
          <div className="flex flex-1 justify-start">
            {index > 0 && (
              <button
                type="button"
                onClick={() => goToPage(index - 1)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition active:bg-slate-50"
              >
                ◀ 上一页
              </button>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex shrink-0 items-center gap-1.5" aria-label={`第 ${index + 1} / ${totalPages} 页`}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <span key={i} className={cn("h-2 rounded-full transition-all", i === index ? "w-4 bg-emerald-500" : "w-2 bg-slate-200")} />
              ))}
            </div>
          )}

          <div className="flex flex-1 justify-end">
            {isLastPage ? (
              <button
                type="button"
                disabled={completing || !canAdvance}
                onClick={handleComplete}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition active:bg-emerald-600 disabled:opacity-50"
              >
                {completing ? "完成中..." : "我看完了"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canAdvance}
                onClick={() => goToPage(index + 1)}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition active:bg-emerald-600 disabled:opacity-50"
              >
                下一页 ▶
              </button>
            )}
          </div>
        </div>

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
