"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCards } from "@/lib/cms/templates";
import type { CmsContentFields, CmsTemplateType } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { ZoomableImage } from "./ZoomableImage";

interface ContentCardViewerProps {
  templateType: CmsTemplateType;
  fields: CmsContentFields;
  onComplete?: () => void;
  completing?: boolean;
  /** "sm" (default) matches the real customer card size. "lg" is for staff
   * review modals (待审核/已发布/编辑预览) where Admin needs to actually
   * inspect photo quality, not just simulate the customer's phone size. */
  imageSize?: "sm" | "lg";
  /** Reports the current card position to a parent reader shell, so it can show
   * "第 X / Y 页" in its header and reset the scroll to the top on each step. */
  onStepChange?: (index: number, total: number) => void;
}

/** Card1 图片+一句重点 → Card2 ... → 互动 → 完成 — one component drives both
 * the CMS "预览" (onComplete is a no-op that just closes the modal) and the
 * real customer-facing viewer (onComplete calls complete_today_content). */
export function ContentCardViewer({ templateType, fields, onComplete, completing, imageSize = "sm", onStepChange }: ContentCardViewerProps) {
  const cards = useMemo(() => buildCards(templateType, fields), [templateType, fields]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const card = cards[index];
  const isLast = index === cards.length - 1;

  useEffect(() => {
    onStepChange?.(index, cards.length);
  }, [index, cards.length, onStepChange]);

  if (!card) {
    return <p className="px-4 py-10 text-center text-sm text-slate-400">内容还没有填写完整</p>;
  }

  function handleNext() {
    if (index < cards.length - 1) {
      setIndex((i) => i + 1);
      setSelected(null);
    } else {
      onComplete?.();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-1.5">
        {cards.map((_, i) => (
          <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-emerald-500" : "w-1.5 bg-slate-200")} />
        ))}
      </div>

      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
        {card.image && (imageSize === "lg" ? (
          <ZoomableImage key={index} src={card.image} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.image} alt="" className="h-32 w-32 rounded-2xl object-cover" />
        ))}
        {card.lines.map((l, i) => (
          <p key={i} className={i === 0 && !card.interactive ? "text-base font-semibold text-slate-900" : "text-sm text-slate-600"}>
            {l}
          </p>
        ))}

        {card.interactive && (
          <div className="mt-2 flex w-full flex-col gap-2">
            {card.interactive.options.map((opt) => {
              const isCorrect = opt === card.interactive!.correctAnswer;
              const isPicked = selected === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={selected !== null}
                  onClick={() => setSelected(opt)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                    selected === null
                      ? "border-slate-200 hover:border-emerald-300"
                      : isCorrect
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : isPicked
                          ? "border-rose-300 bg-rose-50 text-rose-600"
                          : "border-slate-100 text-slate-300",
                  )}
                >
                  {opt}
                </button>
              );
            })}
            {selected !== null && card.interactive.explanation && <p className="mt-1 text-xs text-slate-500">{card.interactive.explanation}</p>}
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={(Boolean(card.interactive) && selected === null) || completing}
        onClick={handleNext}
        className="rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
      >
        {completing ? "完成中..." : isLast ? "完成" : "下一步"}
      </button>
    </div>
  );
}
