"use client";

import { useEffect, useRef, useState } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Scroll-to-zoom + drag-to-pan image viewer for the Admin content-review
 * modals — plain <img> was too small/cropped to actually judge photo
 * quality. Wheel listener is attached via a native (non-passive) handler
 * since React's onWheel is passive by default and can't preventDefault. */
export function ZoomableImage({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      setScale((s) => clamp(s - e.deltaY * 0.0015, MIN_SCALE, MAX_SCALE));
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  function handlePointerDown(e: React.PointerEvent) {
    if (scale <= 1) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const { startX, startY, panX, panY } = dragState.current;
    setPan({ x: panX + (e.clientX - startX), y: panY + (e.clientY - startY) });
  }

  function handlePointerUp() {
    dragState.current = null;
    setIsDragging(false);
  }

  function zoomBy(delta: number) {
    setScale((s) => clamp(s + delta, MIN_SCALE, MAX_SCALE));
  }

  function reset() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="relative h-80 w-full touch-none overflow-hidden rounded-2xl bg-slate-100"
        style={{ cursor: scale > 1 ? "grab" : "default" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-contain"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transition: isDragging ? "none" : "transform 0.05s linear" }}
        />
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <button type="button" onClick={() => zoomBy(-0.4)} className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-600 hover:border-emerald-300">
          −
        </button>
        <button type="button" onClick={reset} className="min-w-[3.5rem] rounded-lg border border-slate-200 px-2 py-1 text-center font-medium text-slate-500 hover:border-emerald-300">
          {Math.round(scale * 100)}%
        </button>
        <button type="button" onClick={() => zoomBy(0.4)} className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-600 hover:border-emerald-300">
          +
        </button>
        <span>滚动鼠标滚轮可缩放，放大后可拖曳移动</span>
      </div>
    </div>
  );
}
