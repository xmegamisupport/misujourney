"use client";

import { useEffect } from "react";
import { badgeIcon, BRAND } from "@/lib/health-collection/config";
import type { BadgeView } from "@/lib/health-collection/types";
import { BadgeRing } from "./BadgeRing";

/**
 * A habit's detail — designed to feel like "I've grown", not "here's my data".
 * Reading order: the habit, where it's growing (a visual timeline), a word of
 * encouragement, and only THEN the small supporting numbers.
 */
export function BadgeDetailSheet({ badge, onClose }: { badge: BadgeView | null; onClose: () => void }) {
  useEffect(() => {
    if (!badge) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [badge, onClose]);

  if (!badge) return null;
  const started = badge.levelIndex >= 0;
  const level = started ? badge.levels[badge.levelIndex] : null;
  const color = level?.color ?? BRAND;
  const next = badge.nextKey ? badge.levels[badge.levelIndex + 1] : null;
  const unit = badge.def.unit;
  const enc = encouragement(badge, next?.name ?? null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 pb-8 shadow-xl sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        {/* ① the habit */}
        <div className="flex flex-col items-center text-center">
          <BadgeRing percent={badge.ringPercent} color={color} icon={badgeIcon(badge.def, badge.levelKey)} size={120} stroke={8} />
          <h2 className="mt-3 text-xl font-bold text-slate-900">{badge.def.habitName}</h2>
          <p className="mt-2 max-w-xs whitespace-pre-line text-sm leading-relaxed text-slate-500">
            {badge.def.description}
          </p>
        </div>

        {/* ② where it's growing — a visual timeline */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-slate-400">成长阶段</p>
          <div className="rounded-2xl bg-slate-50/70 px-4 py-3">
            {badge.levels.map((lv, i) => {
              const done = i < badge.levelIndex;
              const current = i === badge.levelIndex;
              const isNext = badge.levelIndex < 0 ? i === 0 : i === badge.levelIndex + 1;
              const reachedLine = i < badge.levelIndex;
              const last = i === badge.levels.length - 1;
              const nameColor = done || current ? lv.color : "#94a3b8";
              return (
                <div key={lv.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {current ? (
                      <span className="h-4 w-4 rounded-full ring-4 ring-emerald-50" style={{ backgroundColor: lv.color }} />
                    ) : done ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: lv.color }}>
                        ✓
                      </span>
                    ) : (
                      <span
                        className={`h-4 w-4 rounded-full border-2 bg-white ${isNext ? "border-emerald-300" : "border-slate-200"}`}
                      />
                    )}
                    {!last && (
                      <span className="my-0.5 w-0.5 flex-1" style={{ minHeight: 16, backgroundColor: reachedLine ? lv.color : "#e6ebe9" }} />
                    )}
                  </div>
                  <div className={`flex items-center gap-2 ${last ? "" : "pb-1"}`}>
                    <span className="text-sm font-semibold" style={{ color: nameColor }}>
                      {lv.name}
                    </span>
                    {current && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">当前</span>
                    )}
                    {!started && isNext && (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">下一步</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ③ encouragement */}
        <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3.5">
          <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-emerald-800">
            {enc.emoji} {enc.text}
          </p>
        </div>

        {/* ④ small supporting stats */}
        <div className="mt-4 flex gap-3">
          <Stat label="累计完成" value={`${badge.lifetime}`} unit={unit} />
          {badge.def.trackStreak && <Stat label="最高连续" value={`${badge.streak}`} unit="天" />}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
        >
          继续保持
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-slate-50 px-4 py-3 text-center">
      <p className="text-slate-900">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">{label}</p>
    </div>
  );
}

function encouragement(badge: BadgeView, nextName: string | null): { emoji: string; text: string } {
  if (badge.levelIndex < 0) {
    return { emoji: "👏", text: "每个好习惯，你本来就拥有。\n今天完成一次，就能点亮它。" };
  }
  if (badge.maxed) {
    return { emoji: "🎉", text: "你已经把它活成了习惯，\n成为 Master —— 继续保持这份坚持！" };
  }
  return {
    emoji: "👏",
    text: `很棒！你已经在培养这个习惯。\n继续保持，距离 ${nextName} 只差 ${badge.remaining} ${badge.def.unit}。`,
  };
}
