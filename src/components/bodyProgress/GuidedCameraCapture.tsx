"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { computeAlignment, isProfileAngle } from "@/lib/bodyProgress/alignment";
import type { BodyProgressAngle } from "@/lib/bodyProgress/types";
import { BODY_PROGRESS_GUIDE_BY_ANGLE } from "@/lib/bodyProgress/guide-assets";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const STABILITY_MS = 2000; // must hold the aligned pose this long before the countdown
const COUNTDOWN_START = 5;
// Translucent ghost-template opacity for the reference photo drawn over the live
// camera. Single easy-to-tune constant (founder spec: start 18–22%).
const OVERLAY_OPACITY = 0.2;

type Phase = "starting" | "guiding" | "countdown" | "captured" | "unsupported" | "denied" | "error";

/** Full-screen, hands-free guided camera for a single angle. It takes over the
 * viewport (a fixed layer above the bottom navigation, so capture feels like the
 * native camera), shows the angle's realistic overlay, and runs the alignment →
 * stability-lock → auto-countdown → auto-capture state machine. Falls back to
 * `fallback` (the plain file-input capture, rendered inline — not full-screen)
 * whenever the live camera or pose model can't run, so capture always works. */
export function GuidedCameraCapture({
  angle,
  angleLabel,
  stepText,
  onCapture,
  onUseGallery,
  onExit,
  fallback,
}: {
  angle: BodyProgressAngle;
  angleLabel: string;
  stepText?: string;
  onCapture: (file: File) => void;
  onUseGallery: () => void;
  onExit?: () => void;
  fallback: React.ReactNode;
}) {
  const profile = isProfileAngle(angle);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alignedSinceRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("starting");
  const capturedUrlRef = useRef<string | null>(null);

  const [phase, setPhaseState] = useState<Phase>("starting");
  const [aligned, setAligned] = useState(false);
  const [message, setMessage] = useState("正在开启相机…");
  const [count, setCount] = useState(0);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const capturedFileRef = useRef<File | null>(null);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    clearCountdown();
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror the capture to match the selfie-mirrored preview the customer saw.
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${Date.now()}.jpg`, { type: "image/jpeg" });
        capturedFileRef.current = file;
        const url = URL.createObjectURL(blob);
        capturedUrlRef.current = url;
        setCapturedUrl(url);
        setPhase("captured");
      },
      "image/jpeg",
      0.9,
    );
  }, [clearCountdown, setPhase]);

  const startCountdown = useCallback(() => {
    setPhase("countdown");
    setCount(COUNTDOWN_START);
    clearCountdown();
    countdownRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          capturePhoto();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [capturePhoto, clearCountdown, setPhase]);

  const cancelCountdown = useCallback(() => {
    clearCountdown();
    alignedSinceRef.current = null;
    setPhase("guiding");
    setCount(0);
  }, [clearCountdown, setPhase]);

  // Per-frame pose detection + alignment state machine. The loop re-schedules
  // itself through a ref (not a direct self-reference) so React Fast Refresh
  // always drives the latest closure.
  const detectLoopRef = useRef<() => void>(() => {});
  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (video && landmarker && video.readyState >= 2 && (phaseRef.current === "guiding" || phaseRef.current === "countdown")) {
      let result: ReturnType<PoseLandmarker["detectForVideo"]> | null = null;
      try {
        result = landmarker.detectForVideo(video, performance.now());
      } catch {
        result = null;
      }
      const lm = result?.landmarks?.[0] ?? null;
      const a = computeAlignment(lm, { mirrored: true, profile });
      setAligned(a.aligned);
      setMessage(a.message);

      if (a.aligned) {
        const now = performance.now();
        if (alignedSinceRef.current === null) alignedSinceRef.current = now;
        // Stability lock: only start the countdown after the aligned pose has
        // been held still for STABILITY_MS.
        if (phaseRef.current === "guiding" && now - alignedSinceRef.current >= STABILITY_MS) {
          startCountdown();
        }
      } else {
        // Any loss of alignment resets the stability timer and — if a countdown
        // was running — cancels it immediately, returning the overlay to white.
        alignedSinceRef.current = null;
        if (phaseRef.current === "countdown") cancelCountdown();
      }
    }
    rafRef.current = requestAnimationFrame(() => detectLoopRef.current());
  }, [cancelCountdown, startCountdown, profile]);

  useEffect(() => {
    detectLoopRef.current = detectLoop;
  }, [detectLoop]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setPhase("unsupported");
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } }, audio: false });
      } catch {
        if (!cancelled) setPhase("denied");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* autoplay may need a tap; the preview still renders */
        }
      }
      setPhase("guiding");
      setMessage("请站进画面里");

      // Load the pose model (best-effort). If it fails, the camera still works
      // with a manual shutter.
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
        const lm = await vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) {
          lm.close();
          return;
        }
        landmarkerRef.current = lm;
      } catch {
        // Pose model unavailable — the automatic flow won't trigger, but the
        // manual shutter (always shown) still works for assisted capture.
        if (!cancelled) setMessage("自动对位暂时不可用，可点圆钮手动拍摄");
      }
      rafRef.current = requestAnimationFrame(() => detectLoopRef.current());
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
    };
    // Mount once: acquire camera + model. The frame loop runs via detectLoopRef.
  }, [setPhase]);

  function retake() {
    if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
    capturedUrlRef.current = null;
    capturedFileRef.current = null;
    setCapturedUrl(null);
    alignedSinceRef.current = null;
    setAligned(false);
    setPhase("guiding");
  }

  // Camera unavailable / denied → fall back to the plain file-input capture,
  // rendered inline (NOT full-screen) so the normal page chrome returns.
  if (phase === "unsupported" || phase === "denied" || phase === "error") {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <p className="text-center text-xs text-slate-500">
          {phase === "denied" ? "没有相机权限，可改用相册上传或允许相机后重试。" : "此设备暂不支持自动对位相机，可改用相册上传。"}
        </p>
        {fallback}
      </div>
    );
  }

  // Captured → full-screen confirmation (Use / Retake).
  if (phase === "captured" && capturedUrl) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-black">
        <div className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-white">
          {angleLabel}{stepText ? ` · ${stepText}` : ""}
        </div>
        <div className="relative flex-1 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedUrl} alt={`${angleLabel}照片`} className="absolute inset-0 h-full w-full object-contain" />
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 pb-8 pt-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
          <button type="button" onClick={retake} className="rounded-2xl border border-white/30 py-3.5 text-sm font-semibold text-white transition active:bg-white/10">
            重拍
          </button>
          <button
            type="button"
            onClick={() => capturedFileRef.current && onCapture(capturedFileRef.current)}
            className="rounded-2xl bg-emerald-500 py-3.5 text-sm font-semibold text-white transition active:bg-emerald-600"
          >
            使用照片
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Live full-screen camera. The video fills the layer (native-camera feel); the
  // overlay, status and countdown float over it, and the bottom nav is covered.
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-black">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />

      {/* The ONLY visual alignment guide: the actual reference photo for this
          angle (front/left/right/back), drawn translucent over the live preview
          so the customer lines up with the ghost person. Mirrored to share the
          selfie preview's coordinate space. No drawn outline / skeleton. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BODY_PROGRESS_GUIDE_BY_ANGLE[angle].src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ opacity: OVERLAY_OPACITY, transform: "scaleX(-1)" }}
      />

      {/* Alignment feedback that never touches the photo itself: a thin
          cyan-green border ring appears around the preview once the position is
          acceptable (the "✓ 位置正确" pill below is the small text indicator). */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-300"
        style={{ boxShadow: aligned ? "inset 0 0 0 4px #34d399" : "inset 0 0 0 0 rgba(52,211,153,0)" }}
      />

      {/* Minimal top bar: exit · title · progress. No instruction cards. */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pb-3 text-white"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", background: "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)" }}
      >
        <button type="button" onClick={onExit} aria-label="退出" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-lg text-white active:bg-black/50">
          ✕
        </button>
        <span className="text-sm font-semibold">{angleLabel}</span>
        <span className="min-w-9 text-right text-sm font-medium text-white/85">{stepText ?? ""}</span>
      </div>

      {/* Countdown — big, centred, auto-driven (no shutter button). */}
      {phase === "countdown" && count > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-[7rem] font-bold leading-none text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">{count}</span>
        </div>
      )}

      {/* Alignment status. Turns cyan-green with "位置正确" once aligned. */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center px-4" style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}>
        <span
          className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${
            aligned ? "bg-emerald-500 text-white" : "bg-black/55 text-white"
          }`}
        >
          {aligned && phase === "guiding" ? "✓ 位置正确，请保持不动" : message}
        </span>
      </div>

      {/* Bottom controls: a manual shutter is ALWAYS available (assisted capture
          — someone else can tap it any time) while the automatic alignment +
          countdown keep running underneath. Self-capture needs no tap at all. */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.1rem)" }}
      >
        {(phase === "guiding" || phase === "countdown") && (
          <button
            type="button"
            onClick={capturePhoto}
            aria-label="拍摄"
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/85 bg-transparent transition active:scale-95"
          >
            <span className="h-12 w-12 rounded-full bg-white transition active:bg-white/80" />
          </button>
        )}
        <p className="text-[11px] text-white/60">对齐后会自动拍摄，也可点圆钮手动拍</p>
        <button type="button" onClick={onUseGallery} className="text-xs font-medium text-white/70 active:text-white">
          改用相册上传
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
