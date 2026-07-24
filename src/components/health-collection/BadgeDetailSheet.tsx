"use client";

import { useEffect, useState } from "react";
import { badgeIcon, BRAND } from "@/lib/health-collection/config";
import type { BadgeView } from "@/lib/health-collection/types";
import { BadgeRing } from "./BadgeRing";

/**
 * A habit's detail — celebrate progress, never emphasise distance. Reading
 * order is emotion-first, and it never lists all five future stages (which only
 * creates pressure). The full ladder lives behind an optional "查看成长路径"
 * reveal instead.
 */
export function BadgeDetailSheet({ badge, onClose }: { badge: BadgeView | null; onClose: () => void }) {
  const [showPath, setShowPath] = useState(false);

  // Reset the path reveal whenever a different habit opens — adjusted during
  // render (React's supported pattern), not in an effect.
  const [prevId, setPrevId] = useState<string | null>(null);
  const currentId = badge?.def.id ?? null;
  if (currentId !== prevId) {
    setPrevId(currentId);
    if (showPath) setShowPath(false);
  }

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

  const progressText = !started
    ? `0 / ${badge.targetInLevel} ${unit}`
    : badge.maxed
      ? "已达成"
      : `${badge.progressInLevel} / ${badge.targetInLevel} ${unit}`;

  const motivation = !started
    ? "✨ 今天完成一次，就能点亮这个习惯。"
    : badge.maxed
      ? "🎉 你已抵达 Master —— 继续保持这份坚持！"
      : `✨ 再坚持 ${badge.remaining} ${unit}，就能成长到 ${next!.name}。`;

  const rarity = started
    ? `❤️ 你已经坚持了 ${badge.lifetime} ${unit}，走在了很多人放弃的前面。`
    : "❤️ 每个坚持下来的人，都曾从第一天开始。";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 pb-8 shadow-xl sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        {/* ① ring ② name ③ description */}
        <div className="flex flex-col items-center text-center">
          <BadgeRing percent={badge.ringPercent} color={color} icon={badgeIcon(badge.def, badge.levelKey)} size={128} stroke={9} />
          <h2 className="mt-3 text-xl font-bold text-slate-900">{badge.def.habitName}</h2>
          <p className="mt-2 max-w-xs whitespace-pre-line text-sm leading-relaxed text-slate-500">
            {badge.def.description}
          </p>
        </div>

        {/* ④ current progress (stage shown once) */}
        <div className="mt-6">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-lg font-bold" style={{ color: started ? color : "#94a3b8" }}>
              {started ? level!.name : "开始培养"}
            </span>
            <span className="text-sm font-semibold tabular-nums text-slate-400">{progressText}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round(badge.ringPercent * 100)}%`, backgroundColor: color, transition: "width .6s ease" }}
            />
          </div>
        </div>

        {/* ⑤ motivation */}
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3.5 text-center">
          <p className="text-sm font-semibold leading-relaxed text-emerald-800">{motivation}</p>
        </div>

        {/* ⑥ statistics */}
        <div className="mt-4 flex gap-3">
          <Stat emoji="🏆" label="累计完成" value={`${badge.lifetime}`} unit={unit} />
          {badge.def.trackStreak && <Stat emoji="🔥" label="最高连续" value={`${badge.streak}`} unit="天" />}
        </div>

        {/* ⑦ rarity — encouragement, not competition */}
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-center text-sm leading-relaxed text-rose-700">
          {rarity}
        </p>

        {/* ⑧ growth quote */}
        <p className="mt-4 whitespace-pre-line px-2 text-center text-sm italic leading-relaxed text-slate-500">
          「{badge.def.quote}」
        </p>

        {/* ⑨ started date */}
        {badge.firstDate && (
          <p className="mt-4 text-center text-xs text-slate-400">📅 从 {formatDate(badge.firstDate)} 开始</p>
        )}

        {/* optional: the full growth path, hidden by default */}
        <button
          type="button"
          onClick={() => setShowPath((s) => !s)}
          className="mt-5 w-full text-center text-xs font-medium text-slate-400 transition hover:text-slate-600"
        >
          {showPath ? "收起成长路径 ▴" : "查看完整成长路径 ▾"}
        </button>
        {showPath && (
          <div className="mt-3 space-y-1 rounded-2xl bg-slate-50/70 px-4 py-3">
            {badge.levels.map((lv, i) => {
              const reached = i <= badge.levelIndex;
              const current = i === badge.levelIndex;
              return (
                <div key={lv.key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: reached ? lv.color : "#e2e8f0" }}
                    >
                      {i < badge.levelIndex ? "✓" : ""}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: reached ? lv.color : "#94a3b8" }}>
                      {lv.name}
                    </span>
                    {current && <span className="rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-700">当前</span>}
                  </div>
                  <span className="text-[11px] tabular-nums text-slate-400">{lv.threshold} {unit}</span>
                </div>
              );
            })}
          </div>
        )}

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

function Stat({ emoji, label, value, unit }: { emoji: string; label: string; value: string; unit: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-slate-50 px-4 py-3 text-center">
      <p className="text-slate-900">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">
        {emoji} {label}
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}年${Number(m)}月${Number(d)}日`;
}
