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

  // Front ("user") is the default (self-capture on a tripod). The customer can
  // switch to the rear ("environment") camera for assisted capture. A ref mirrors
  // the state so the capture/detection callbacks read it without dependency churn.
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const facingModeRef = useRef<"user" | "environment">("user");
  const lastGoodFacingRef = useRef<"user" | "environment">("user");
  const mirrored = facingMode === "user"; // only the front camera is mirrored
  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

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
    const vw = video.videoWidth || 720;
    const vh = video.videoHeight || 1280;
    // Phone cameras deliver natively LANDSCAPE frames; the preview only looks
    // portrait because the <video> is object-cover-cropped into the portrait
    // viewport. Reproduce that exact crop here so the captured image is portrait
    // and matches what the customer saw (otherwise it saves landscape).
    const boxW = video.clientWidth || vw;
    const boxH = video.clientHeight || vh;
    const scale = Math.max(boxW / vw, boxH / vh);
    const cropW = Math.min(vw, boxW / scale);
    const cropH = Math.min(vh, boxH / scale);
    const sx = (vw - cropW) / 2;
    const sy = (vh - cropH) / 2;
    canvas.width = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Draw only the visible (cover-cropped) portrait region. Mirror ONLY for the
    // front camera, matching its mirrored preview — the rear camera is never
    // mirrored, so its saved photo keeps the true (un-mirrored) orientation and
    // is never double-mirrored.
    ctx.save();
    if (facingModeRef.current === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
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
      const a = computeAlignment(lm, { mirrored: facingModeRef.current === "user", profile });
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

  // Keep the live stream attached to the <video>. srcObject is first set in the
  // mount effect, but the captured-confirm screen unmounts the video element;
  // returning to the live view (Retake, or countdown→guiding) mounts a FRESH
  // <video> that has no stream — so re-attach it here or the preview stays black.
  useEffect(() => {
    if (phase !== "starting" && phase !== "guiding" && phase !== "countdown") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    video.play().catch(() => {
      /* autoplay may need a tap; the preview still renders */
    });
  }, [phase]);

  // Mount once: load the pose model (best-effort) and start the frame loop. Kept
  // separate from stream acquisition so switching cameras never reloads the model.
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    })();
    rafRef.current = requestAnimationFrame(() => detectLoopRef.current());
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current);
    };
  }, []);

  // Acquire the camera for the current facingMode. Re-runs whenever facingMode
  // changes (the camera switch): the cleanup stops every track of the old stream
  // before the new one is requested, then the new stream is attached to the SAME
  // video element and the preview resumes. If a switch to the rear camera fails,
  // we fall back to the last working camera with a short, non-blocking message.
  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setPhase("unsupported");
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: false,
        });
      } catch {
        if (cancelled) return;
        if (facingMode !== lastGoodFacingRef.current) {
          // A switch failed — restore the last working camera, don't block capture.
          setSwitchError(facingMode === "environment" ? "无法开启后置镜头，已切回原镜头" : "无法开启前置镜头，已切回原镜头");
          setFacingMode(lastGoodFacingRef.current);
        } else {
          setPhase("denied");
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      lastGoodFacingRef.current = facingMode;
      setSwitchError(null);
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
      // Permission is granted now, so device labels/kinds are reliable — decide
      // whether to show the flip button.
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setHasMultipleCameras(devices.filter((d) => d.kind === "videoinput").length > 1);
      } catch {
        /* enumeration best-effort */
      }
    }
    acquire();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode, setPhase]);

  // Flip between front and rear. Cancels any countdown and resets alignment so
  // detection only restarts once the new preview is ready (via the stream effect).
  function switchCamera() {
    clearCountdown();
    alignedSinceRef.current = null;
    setAligned(false);
    setCount(0);
    setPhase("starting");
    setFacingMode((m) => (m === "user" ? "environment" : "user"));
  }

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
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: mirrored ? "scaleX(-1)" : "none" }}
      />

      {/* The ONLY visual alignment guide: the actual reference photo for this
          angle (front/left/right/back), drawn translucent over the live preview
          so the customer lines up with the ghost person. It shares the preview's
          coordinate space by mirroring exactly when the preview is mirrored
          (front camera only), so ghost and customer always stay aligned on both
          cameras. No drawn outline / skeleton. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BODY_PROGRESS_GUIDE_BY_ANGLE[angle].src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ opacity: OVERLAY_OPACITY, transform: mirrored ? "scaleX(-1)" : "none" }}
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

      {/* Camera flip — front ↔ rear. Shown only when the device has more than one
          camera. Sits clear of the centred body/overlay. */}
      {hasMultipleCameras && (
        <button
          type="button"
          onClick={switchCamera}
          aria-label="切换前后镜头"
          className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white active:bg-black/60"
          style={{ top: "calc(env(safe-area-inset-top) + 3.75rem)" }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9a8 8 0 0 1 13-3l3 3" />
            <path d="M20 4v5h-5" />
            <path d="M20 15a8 8 0 0 1-13 3l-3-3" />
            <path d="M4 20v-5h5" />
          </svg>
        </button>
      )}

      {/* Non-blocking switch error (e.g. rear camera unavailable). */}
      {switchError && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center px-4" style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)" }}>
          <span className="rounded-full bg-rose-500/90 px-3 py-1 text-xs font-medium text-white shadow-lg">{switchError}</span>
        </div>
      )}

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
