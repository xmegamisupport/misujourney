"use client";

import { useRef, useState } from "react";
import { LIVING_GARDEN_CHAPTERS, type LivingGardenChapterMeta } from "@/lib/living-garden/chapters";
import { VolumeCover } from "./VolumeCover";

/** ── The Storybook — Stage 1: Wonder ────────────────────────────────────────
 *
 * The founder's note: the first version read as a chapter LIST — clean, but a
 * management system. This is the correction. The screen is an illustrated
 * storybook, not a selector: each volume is a full page you swipe through, the
 * cover art is the first thing the eye lands on, and the page ITSELF is the way
 * in — no "Open" button, no "Enter". You tap the book the way you'd open a real
 * one.
 *
 * Reading order, by design: cover art → title → one-line story → progress →
 * (tap) → the world. A button must never be the first thing noticed, so there
 * isn't one; the only affordance is a whisper at the foot of the page.
 *
 * Optimised for the feeling, not for information density. Adding Volume IV+ is
 * one entry in the chapter registry — this page never needs redrawing. */
export function LivingGardenBook({ currentDay, onOpen }: { currentDay: number | null; onOpen: (chapterId: string) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    // Full-bleed: the book is held, not floated in a padded column.
    <div className="-mt-6 flex h-[calc(100dvh-8rem)] min-h-[560px] flex-col bg-gradient-to-b from-[#faf3e6] to-[#eef3ea] px-0">
      <p className="shrink-0 pt-5 text-center text-[11px] font-medium uppercase tracking-[0.4em] text-emerald-800/45">
        Living Garden
      </p>

      {/* One page per volume, swiped horizontally like turning a storybook. */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {LIVING_GARDEN_CHAPTERS.map((chapter) => (
          <VolumePage key={chapter.id} chapter={chapter} currentDay={currentDay} onOpen={() => onOpen(chapter.id)} />
        ))}
      </div>

      {/* Page dots — a quiet hint that more worlds are waiting. */}
      <div className="flex shrink-0 items-center justify-center gap-1.5 pb-5 pt-1">
        {LIVING_GARDEN_CHAPTERS.map((c, i) => (
          <span
            key={c.id}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-4 bg-emerald-500/80" : "w-1.5 bg-emerald-900/15"}`}
          />
        ))}
      </div>
    </div>
  );
}

function VolumePage({
  chapter,
  currentDay,
  onOpen,
}: {
  chapter: LivingGardenChapterMeta;
  currentDay: number | null;
  onOpen: () => void;
}) {
  const available = chapter.status === "available";
  const day = Math.max(1, Math.min(chapter.totalDays, currentDay ?? 1));
  const percent = Math.round((day / chapter.totalDays) * 100);

  // The whole page is the interaction for an openable world; a locked one is
  // just a page you cannot turn yet.
  const Tag = available ? "button" : "div";

  return (
    <div className="flex w-full shrink-0 snap-center items-stretch px-6 pb-2 pt-3">
      <Tag
        {...(available ? { type: "button" as const, onClick: onOpen, "aria-label": `翻开 ${chapter.title}` } : {})}
        className={`relative flex w-full flex-col overflow-hidden rounded-[1.75rem] text-left shadow-[0_18px_50px_-20px_rgba(60,50,30,0.45)] ring-1 ring-black/5 transition ${
          available ? "active:scale-[0.985]" : ""
        }`}
      >
        {/* ① Cover illustration — the largest thing, and the first thing seen. */}
        <div className="relative h-[58%] w-full">
          <VolumeCover theme={chapter.cover} muted={!available} />

          {/* Title plate, set into the base of the illustration like a book cover. */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent px-6 pb-5 pt-12">
            <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/75">Volume {chapter.numeral}</p>
            {/* ③ Chapter title */}
            <p className="mt-1 font-serif text-[26px] font-semibold leading-tight text-white drop-shadow-sm">{chapter.title}</p>
            <p className="mt-0.5 text-xs italic text-white/70">{chapter.subtitle}</p>
          </div>

          {!available && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25">
              <span className="text-2xl">🔒</span>
              <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-medium tracking-wide text-slate-600">
                敬请期待
              </span>
            </div>
          )}
        </div>

        {/* The lower half of the page — paper. */}
        <div className="flex flex-1 flex-col bg-[#fdfaf2] px-6 py-6">
          {/* ④ One-line story */}
          <p className="font-serif text-[15px] italic leading-relaxed text-slate-600">{chapter.story}</p>

          <div className="mt-auto">
            {available ? (
              <>
                {/* ⑤ Progress — woven into the page as a line, not a card. */}
                <div className="flex items-baseline justify-between">
                  <span className="text-xs tracking-wide text-slate-400">
                    第 <span className="font-serif text-lg font-semibold text-emerald-700">{day}</span> 天 · 共 {chapter.totalDays} 天
                  </span>
                </div>
                <div className="mt-2 h-px w-full bg-slate-200">
                  <div className="h-px bg-emerald-500/70" style={{ width: `${percent}%` }} />
                </div>
                {/* ⑥ The only affordance — a whisper, never a button. */}
                <p className="mt-4 text-center text-[11px] tracking-[0.25em] text-emerald-700/50">轻 触 翻 开</p>
              </>
            ) : (
              <p className="mt-4 text-center text-[11px] tracking-[0.25em] text-slate-300">即 将 展 开</p>
            )}
          </div>
        </div>
      </Tag>
    </div>
  );
}
