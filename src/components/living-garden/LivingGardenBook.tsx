"use client";

import { LIVING_GARDEN_CHAPTERS, type LivingGardenChapterMeta } from "@/lib/living-garden/chapters";

/** ── The Living Garden Book — Stage 1: Wonder ───────────────────────────────
 *
 * The first screen is NOT the garden. It is the cover of a storybook, whose one
 * job is anticipation: "there are many worlds waiting for me." Immersion —
 * "this is my own garden" — comes only after she chooses to open a chapter.
 * Skipping this stage was the bug; the entrance now restores it.
 *
 * Deliberately not a dashboard: no cards, no feature list, no settings. Just a
 * title, a prominent first chapter, and the locked ones beneath it as a promise.
 * The book maps over the chapter registry, so Chapter IV+ appear here with no
 * change to this file. */
export function LivingGardenBook({ currentDay, onOpen }: { currentDay: number | null; onOpen: (chapterId: string) => void }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-11rem)] max-w-md flex-col px-5">
      {/* Cover title */}
      <div className="pt-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-emerald-700/60">Living Garden</p>
        <p className="mt-2 font-serif text-2xl font-semibold text-slate-800">你的秘密花园</p>
        <p className="mt-1.5 text-sm text-slate-400">每一个坚持，都会唤醒一个世界</p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {LIVING_GARDEN_CHAPTERS.map((chapter, i) => (
          <ChapterSpine
            key={chapter.id}
            chapter={chapter}
            currentDay={currentDay}
            featured={i === 0}
            onOpen={() => onOpen(chapter.id)}
          />
        ))}
      </div>

      <p className="mt-auto py-8 text-center text-xs text-slate-300">更多章节，正在书写中</p>
    </div>
  );
}

function ChapterSpine({
  chapter,
  currentDay,
  featured,
  onOpen,
}: {
  chapter: LivingGardenChapterMeta;
  currentDay: number | null;
  featured: boolean;
  onOpen: () => void;
}) {
  const available = chapter.status === "available";
  const day = available ? Math.max(1, Math.min(chapter.totalDays, currentDay ?? 1)) : 0;
  const percent = available ? Math.round((day / chapter.totalDays) * 100) : 0;

  // The featured (first) chapter is warm and open; later chapters are quiet and
  // dimmed — present enough to promise a world, not enough to compete.
  if (!available) {
    return (
      <div className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white/50 px-5 py-5 opacity-70">
        <span className="font-serif text-2xl font-semibold text-slate-300">{chapter.numeral}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-500">{chapter.title}</p>
          <p className="mt-0.5 truncate text-xs italic text-slate-400">{chapter.subtitle}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-300">🔒 敬请期待</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex flex-col rounded-3xl border p-6 text-left transition ${
        featured
          ? "border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-amber-50/60 shadow-sm active:scale-[0.99]"
          : "border-slate-100 bg-white active:scale-[0.99]"
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="font-serif text-3xl font-semibold text-emerald-700/80">{chapter.numeral}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-700/50">Chapter {chapter.numeral}</p>
          <p className="mt-0.5 font-serif text-xl font-semibold text-slate-800">{chapter.title}</p>
          <p className="mt-0.5 text-xs italic text-slate-400">{chapter.subtitle}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs text-slate-400">
            旅程进度 <span className="font-semibold text-slate-600">{day}</span> / {chapter.totalDays} 天
          </span>
          <span className="text-xs font-semibold text-emerald-600 transition group-active:translate-x-0.5">翻开这一章 →</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/70">
          <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </button>
  );
}
