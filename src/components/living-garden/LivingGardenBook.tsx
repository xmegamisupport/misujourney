"use client";

import { useState } from "react";
import { LIVING_GARDEN_CHAPTERS, type LivingGardenChapterMeta } from "@/lib/living-garden/chapters";
import { VolumeCover } from "./VolumeCover";

/** ── The Storybook — Stage 1: Wonder ────────────────────────────────────────
 *
 * Third pass, and this one is a composition rethink rather than a restyle.
 * The card versions kept reading as "an app": a rounded panel floating on a
 * background. A real storybook feels different because you can see the OBJECT —
 * a cloth cover, a spine, a ribbon, the thickness of the pages — and the
 * illustration sits ON the page like a plate in a picture book.
 *
 * So this renders the book itself. One hero page fills the screen; the current
 * chapter is the whole page and the whole page is the tap target — no "Open",
 * no "Enter". Future volumes shrink to a small shelf at the foot, present only
 * to promise more worlds. The UI almost disappears; the page is the interface.
 *
 * Adding Volume IV+ stays one entry in the chapter registry: the hero shows the
 * first available chapter, the shelf maps the rest. */
export function LivingGardenBook({ currentDay, onOpen }: { currentDay: number | null; onOpen: (chapterId: string) => void }) {
  const firstAvailable = LIVING_GARDEN_CHAPTERS.find((c) => c.status === "available") ?? LIVING_GARDEN_CHAPTERS[0];
  const [heroId, setHeroId] = useState(firstAvailable.id);
  const hero = LIVING_GARDEN_CHAPTERS.find((c) => c.id === heroId) ?? firstAvailable;

  return (
    <div className="-mt-6 flex h-[calc(100dvh-8rem)] min-h-[580px] flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#f4e3df_0%,#efe6da_45%,#e7ddcf_100%)]">
      <p className="shrink-0 pt-5 text-center text-[11px] font-medium uppercase tracking-[0.42em] text-[#8a6f66]">
        Living Garden
      </p>

      {/* The open book — the hero page. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-3">
        <HeroBook chapter={hero} currentDay={currentDay} onOpen={() => hero.status === "available" && onOpen(hero.id)} />
      </div>

      {/* The shelf — future worlds, small, for anticipation only. */}
      <div className="shrink-0 bg-[#dccfbd]/50 px-4 pb-5 pt-4">
        <div className="mx-auto flex max-w-sm items-end justify-center gap-3">
          {LIVING_GARDEN_CHAPTERS.map((chapter) => (
            <ShelfVolume
              key={chapter.id}
              chapter={chapter}
              active={chapter.id === heroId}
              onSelect={() => chapter.status === "available" && setHeroId(chapter.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroBook({ chapter, currentDay, onOpen }: { chapter: LivingGardenChapterMeta; currentDay: number | null; onOpen: () => void }) {
  const available = chapter.status === "available";
  const day = Math.max(1, Math.min(chapter.totalDays, currentDay ?? 1));
  const percent = Math.round((day / chapter.totalDays) * 100);
  const Tag = available ? "button" : "div";

  return (
    <div className="relative h-full w-full max-w-sm">
      {/* Cloth cover peeking behind the page — this is what makes it a book. */}
      <div className="absolute -inset-x-1.5 -bottom-2 top-1 rounded-[2rem] bg-gradient-to-b from-[#c69a93] to-[#a3746e] shadow-[0_28px_55px_-24px_rgba(80,50,45,0.65)]" />
      {/* Page edges stacked under the right/bottom, hinting at thickness. */}
      <div className="absolute -bottom-1 left-4 right-2 h-3 rounded-b-[1.6rem] bg-[#efe6d3]" />
      <div className="absolute right-[3px] bottom-4 top-6 w-1.5 rounded-r-xl bg-[#efe6d3]" />

      {/* Ribbon bookmark. */}
      <div className="absolute right-8 top-[-2px] z-20 h-14 w-6">
        <div className="h-full w-full bg-[#e39aa6] shadow-sm [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]" />
      </div>

      {/* The page itself — the entire surface is the way in. */}
      <Tag
        {...(available ? { type: "button" as const, onClick: onOpen, "aria-label": `翻开 ${chapter.title}` } : {})}
        className={`absolute inset-0 flex flex-col overflow-hidden rounded-[1.7rem] bg-[#fdf7ea] px-6 pb-5 pt-7 text-left transition ${
          available ? "active:scale-[0.99]" : ""
        }`}
      >
        {/* Soft spine shadow down the left edge of the paper. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/[0.06] to-transparent" />

        {/* ① Chapter + ② Title + ③ Story — set on the paper, above the plate. */}
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[#a98b53]">Chapter {chapter.numeral}</p>
          <p className="mt-1 font-serif text-[26px] font-semibold leading-tight text-[#4a4038]">{chapter.title}</p>
          <p className="mx-auto mt-2 max-w-[16rem] font-serif text-[13px] italic leading-relaxed text-[#8a7d6d]">{chapter.story}</p>
        </div>

        {/* ④ Illustration — the hero, a framed plate on the page. */}
        <div className="relative mx-auto mt-4 aspect-square w-full max-w-[15rem] flex-1">
          <div className="absolute inset-0 overflow-hidden rounded-2xl bg-white shadow-[0_10px_24px_-14px_rgba(60,45,30,0.55)] ring-1 ring-[#e6d9bf]">
            <VolumeCover theme={chapter.cover} muted={!available} />
          </div>
          {!available && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-black/25">
              <span className="text-2xl">🔒</span>
              <span className="rounded-full bg-white/85 px-3 py-0.5 text-xs font-medium text-slate-600">敬请期待</span>
            </div>
          )}
        </div>

        {/* ⑤ Progress — a line on the page, with a growing sprout. */}
        <div className="mt-4">
          {available ? (
            <>
              <p className="mb-1.5 text-center text-xs tracking-wide text-[#9a8b78]">
                进度 <span className="font-serif text-base font-semibold text-emerald-700">{day}</span> / {chapter.totalDays} 天
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm">🌱</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8dcc4]">
                  <div className="h-full rounded-full bg-emerald-500/80" style={{ width: `${percent}%` }} />
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] tracking-[0.3em] text-[#b0a08a]">轻 触 翻 开</p>
            </>
          ) : (
            <p className="text-center text-[11px] tracking-[0.3em] text-[#c3b6a2]">即 将 展 开</p>
          )}
        </div>
      </Tag>
    </div>
  );
}

function ShelfVolume({ chapter, active, onSelect }: { chapter: LivingGardenChapterMeta; active: boolean; onSelect: () => void }) {
  const available = chapter.status === "available";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${chapter.title}${available ? "" : "（敬请期待）"}`}
      className="flex w-[5.4rem] flex-col items-center gap-1"
    >
      <div
        className={`relative h-16 w-full overflow-hidden rounded-xl ring-1 transition ${
          active ? "ring-2 ring-emerald-500/70" : "ring-black/10"
        }`}
      >
        <VolumeCover theme={chapter.cover} muted={!available} />
        {!available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-sm">🔒</div>
        )}
      </div>
      <span className={`truncate text-[10px] ${active ? "font-semibold text-emerald-700" : "text-[#8a7c6c]"}`}>
        Ch.{chapter.numeral}
      </span>
      <span className="text-[9px] leading-none text-[#b0a08a]">{available ? "进行中" : "未解锁"}</span>
    </button>
  );
}
