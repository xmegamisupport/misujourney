"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { computeAlignment } from "@/lib/bodyProgress/alignment";
import { AlignmentOverlay } from "./AlignmentOverlay";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const STABILITY_MS = 2000; // must hold the aligned pose this long before the countdown
const COUNTDOWN_START = 5;

const POSE_TIPS = ["正面对着镜头", "双脚与肩同宽", "双手自然垂放身体两侧", "自然站立，不用刻意收腹", "身体不要前倾或后仰"];

type Phase = "starting" | "guiding" | "countdown" | "captured" | "unsupported" | "denied" | "error";

/** Guided, hands-free camera capture for one angle. Falls back to `fallback`
 * (the plain file-input capture) whenever the live camera or pose model can't
 * run, so capture always works and existing functionality is never lost. */
export function GuidedCameraCapture({
  angleLabel,
  onCapture,
  onUseGallery,
  fallback,
}: {
  angleLabel: string;
  onCapture: (file: File) => void;
  onUseGallery: () => void;
  fallback: React.ReactNode;
}) {
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
  const [poseReady, setPoseReady] = useState(false);
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
      const a = computeAlignment(lm, true);
      setAligned(a.aligned);
      setMessage(a.message);

      if (a.aligned) {
        const now = performance.now();
        if (alignedSinceRef.current === null) alignedSinceRef.current = now;
        if (phaseRef.current === "guiding" && now - alignedSinceRef.current >= STABILITY_MS) {
          startCountdown();
        }
      } else {
        alignedSinceRef.current = null;
        if (phaseRef.current === "countdown") cancelCountdown();
      }
    }
    rafRef.current = requestAnimationFrame(() => detectLoopRef.current());
  }, [cancelCountdown, startCountdown]);

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
        setPoseReady(true);
      } catch {
        if (!cancelled) {
          setPoseReady(false);
          setMessage("自动对位暂时不可用，可手动拍摄");
        }
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

  // Camera unavailable / denied → fall back to the plain file-input capture.
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

  // Captured → confirm screen.
  if (phase === "captured" && capturedUrl) {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <div className="w-64 max-w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedUrl} alt={`${angleLabel}照片`} className="w-full object-contain" />
        </div>
        <div className="grid w-64 max-w-full grid-cols-2 gap-2">
          <button type="button" onClick={retake} className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            重拍
          </button>
          <button
            type="button"
            onClick={() => capturedFileRef.current && onCapture(capturedFileRef.current)}
            className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            使用照片
          </button>
        </div>
      </div>
    );
  }

  // Live camera + overlay.
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative aspect-[3/4] w-64 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
        <AlignmentOverlay aligned={aligned} />

        {phase === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl font-bold text-white drop-shadow-lg">{count}</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex justify-center p-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${aligned ? "bg-emerald-500/90 text-white" : "bg-black/55 text-white"}`}>{message}</span>
        </div>
      </div>

      {/* Manual shutter only when the pose model isn't available. */}
      {!poseReady && phase === "guiding" && (
        <button type="button" onClick={capturePhoto} className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600">
          手动拍摄
        </button>
      )}

      <div className="w-64 max-w-full rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
        <p className="mb-1 text-[11px] font-semibold text-slate-500">保持一致的自然站姿</p>
        <ul className="flex flex-col gap-0.5 text-[11px] text-slate-500">
          {POSE_TIPS.map((t) => (
            <li key={t}>· {t}</li>
          ))}
        </ul>
      </div>

      <button type="button" onClick={onUseGallery} className="text-xs font-medium text-slate-400 transition hover:text-slate-600">
        改用相册上传
      </button>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
