"use client";

import type { CmsCard } from "@/lib/cms/templates";
import { cn } from "@/lib/utils";
import { ZoomableImage } from "./ZoomableImage";

interface TemplateCardPageProps {
  card: CmsCard;
  /** "sm" (default) matches the real customer card size. "lg" is for staff
   * review modals where Admin needs to inspect photo quality. */
  imageSize?: "sm" | "lg";
  /** Controlled answer for an interactive card — owned by whichever shell is
   * paging (the customer Learning Reader, or the CMS preview stepper). */
  selected: string | null;
  onSelect: (option: string) => void;
  /** Remounts the zoomable image when the page changes. */
  pageKey?: number;
}

/** ONE template card, rendered. Pure presentation: no page index, no dots, no
 * next/complete button — those belong to the shell above it, so the customer
 * Learning Reader and the CMS preview can page through identical cards without
 * duplicating this markup. */
export function TemplateCardPage({ card, imageSize = "sm", selected, onSelect, pageKey }: TemplateCardPageProps) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
      {card.image &&
        (imageSize === "lg" ? (
          <ZoomableImage key={pageKey} src={card.image} />
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
                onClick={() => onSelect(opt)}
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
  );
}
