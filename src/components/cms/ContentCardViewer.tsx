"use client";

import { useMemo, useState } from "react";
import { buildCards } from "@/lib/cms/templates";
import type { CmsContentFields, CmsTemplateType } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { TemplateCardPage } from "./TemplateCardPage";

interface ContentCardViewerProps {
  templateType: CmsTemplateType;
  fields: CmsContentFields;
  onComplete?: () => void;
  completing?: boolean;
  /** "sm" (default) matches the real customer card size. "lg" is for staff
   * review modals (待审核/已发布/编辑预览) where Admin needs to actually
   * inspect photo quality, not just simulate the customer's phone size. */
  imageSize?: "sm" | "lg";
}

/** The CMS-side preview stepper (待审核 / 已发布 / 编辑预览). Customers do NOT
 * see this — they always read through the single Learning Reader
 * (LearningContentModal). Both page over the same TemplateCardPage, so a card
 * looks identical to staff and to customers; only the surrounding chrome
 * differs (a preview pane here, a full reader there). */
export function ContentCardViewer({ templateType, fields, onComplete, completing, imageSize = "sm" }: ContentCardViewerProps) {
  const cards = useMemo(() => buildCards(templateType, fields), [templateType, fields]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const card = cards[index];
  const isLast = index === cards.length - 1;

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

      <TemplateCardPage card={card} imageSize={imageSize} selected={selected} onSelect={setSelected} pageKey={index} />

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
