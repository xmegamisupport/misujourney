"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AnglePhotoSlot } from "@/components/bodyProgress/AnglePhotoSlot";
import { GuidedCameraCapture } from "@/components/bodyProgress/GuidedCameraCapture";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { uploadBodyProgressPhoto, listUploadedBodyProgressPhotos, getBodyProgressPhotoSignedUrl } from "@/lib/bodyProgress/engine";
import { BODY_PROGRESS_ANGLES } from "@/lib/bodyProgress/constants";
import { BODY_PROGRESS_GUIDE_BY_ANGLE } from "@/lib/bodyProgress/guide-assets";
import type { BodyProgressAngle } from "@/lib/bodyProgress/types";

const ANGLE_LABELS: Record<BodyProgressAngle, string> = { front: "正面", left: "左侧", right: "右侧", back: "背面" };

/** Guided capture (V3): every angle follows the same rhythm —
 *   Example (the reference photo for THIS angle) → Start Capture → Camera →
 *   automatic or manual capture → the next angle's Example → … → Review.
 * The example-before-camera step means the customer never has to remember how
 * an angle should look; the reference is the instruction. A single-angle retake
 * (`?retake=<angle>`) reopens only that angle's Example→Camera and returns to
 * Review, leaving the other three untouched. */
export default function BodyProgressCapturePage() {
  return (
    <Suspense>
      <BodyProgressCaptureFlow />
    </Suspense>
  );
}

type Step = "example" | "camera";

function BodyProgressCaptureFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("recordId");
  const mode = (searchParams.get("mode") as "camera" | "library" | null) ?? "camera";
  const from = searchParams.get("from");
  const fromSuffix = from ? `&from=${from}` : "";
  const retakeParam = searchParams.get("retake");
  const retakeAngle = (BODY_PROGRESS_ANGLES as string[]).includes(retakeParam ?? "") ? (retakeParam as BodyProgressAngle) : null;

  const { user } = useAuthUser();
  const customerId = user?.id ?? "";

  const [doneUrls, setDoneUrls] = useState<Partial<Record<BodyProgressAngle, string | null>>>({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guided-camera mode can be switched to a plain gallery upload per angle.
  const [useGallery, setUseGallery] = useState(false);
  const [step, setStep] = useState<Step>("example");
  const [activeAngle, setActiveAngle] = useState<BodyProgressAngle | null>(null);

  const reviewHref = `/customer/progress/body/review?recordId=${recordId}${fromSuffix}`;

  // On mount: learn what's already uploaded, then pick the starting angle.
  // Retake mode jumps straight to the requested angle; otherwise start at the
  // first angle that still needs a photo (all done → go review).
  const startedRef = useRef(false);
  useEffect(() => {
    if (!customerId || !recordId || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    listUploadedBodyProgressPhotos(customerId, recordId).then(async (uploaded) => {
      if (cancelled) return;
      const urls = await Promise.all(uploaded.map(async (p) => [p.angle, await getBodyProgressPhotoSignedUrl(p.path)] as const));
      if (cancelled) return;
      const doneMap = Object.fromEntries(urls) as Partial<Record<BodyProgressAngle, string | null>>;
      setDoneUrls(doneMap);

      if (retakeAngle) {
        setActiveAngle(retakeAngle);
        setStep("example");
        setLoadingInitial(false);
        return;
      }
      const firstRemaining = BODY_PROGRESS_ANGLES.find((a) => !doneMap[a]);
      if (!firstRemaining) {
        router.replace(reviewHref);
        return;
      }
      setActiveAngle(firstRemaining);
      setStep("example");
      setLoadingInitial(false);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, recordId, retakeAngle, router, reviewHref]);

  // Upload the just-captured photo for the active angle, then advance.
  async function uploadAndAdvance(file: File) {
    if (!activeAngle || !recordId) return;
    setUploading(true);
    setError(null);
    const result = await uploadBodyProgressPhoto(customerId, recordId, activeAngle, file);
    if (!result.ok) {
      setUploading(false);
      setError(result.error ?? "上传失败，请重试");
      return;
    }
    const url = await getBodyProgressPhotoSignedUrl(`${customerId}/${recordId}/${activeAngle}.${result.data!.ext}`);
    setUploading(false);
    const doneMap = { ...doneUrls, [activeAngle]: url };
    setDoneUrls(doneMap);

    // Retake a single angle → straight back to Review. Otherwise continue to the
    // next angle's Example (or Review once every angle has a photo).
    if (retakeAngle) {
      router.push(reviewHref);
      return;
    }
    const next = BODY_PROGRESS_ANGLES.find((a) => !doneMap[a]);
    if (!next) {
      router.push(reviewHref);
      return;
    }
    setActiveAngle(next);
    setUseGallery(false);
    setStep("example");
  }

  if (!recordId) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
        <PageHeader title="身形记录" backHref="/customer/progress/body" />
        <p className="text-sm text-slate-500">缺少记录信息，请重新开始。</p>
      </div>
    );
  }

  if (loadingInitial || !activeAngle) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
        <PageHeader title="身形记录" backHref="/customer/progress/body" />
        <p className="text-sm text-slate-400">正在准备…</p>
      </div>
    );
  }

  const label = ANGLE_LABELS[activeAngle];
  const stepIndex = BODY_PROGRESS_ANGLES.indexOf(activeAngle) + 1;
  const stepText = `${stepIndex} / ${BODY_PROGRESS_ANGLES.length}`;
  const cameraStep = step === "camera";
  const anyDone = BODY_PROGRESS_ANGLES.some((a) => doneUrls[a]);

  // ── Example screen: the reference photo for THIS angle is the instruction ──
  if (!cameraStep) {
    const guide = BODY_PROGRESS_GUIDE_BY_ANGLE[activeAngle];
    return (
      <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
        <PageHeader title={`📷 ${label}`} subtitle={retakeAngle ? "重新拍摄这一张" : `第 ${stepText} 张`} backHref={reviewHref} />

        <figure className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={guide.src} alt={`${label}参考示范`} className="max-h-[60vh] w-full object-contain" />
          <figcaption className="py-2 text-center text-xs text-slate-400">站成和示范一样的角度</figcaption>
        </figure>

        {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

        <button
          type="button"
          onClick={() => setStep("camera")}
          className="rounded-2xl bg-emerald-500 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        >
          {mode === "library" ? `上传${label}照片` : `开始拍摄${label}`}
        </button>

        {retakeAngle ? (
          <Link href={reviewHref} className="py-1 text-center text-sm font-medium text-slate-400 transition hover:text-slate-600">
            取消，返回检查
          </Link>
        ) : anyDone ? (
          <Link href={reviewHref} className="py-1 text-center text-sm font-medium text-slate-400 transition hover:text-slate-600">
            先去检查已拍的
          </Link>
        ) : (
          <Link href="/customer/progress/body" className="py-1 text-center text-sm font-medium text-slate-400 transition hover:text-slate-600">
            以后再说
          </Link>
        )}
      </div>
    );
  }

  // ── Camera screen ──
  if (mode === "camera" && !useGallery) {
    // Full-screen hands-free guided camera (also offers a manual shutter for
    // assisted capture). Renders above the bottom nav.
    return (
      <GuidedCameraCapture
        key={activeAngle}
        angle={activeAngle}
        angleLabel={label}
        stepText={stepText}
        onCapture={uploadAndAdvance}
        onUseGallery={() => setUseGallery(true)}
        onExit={() => setStep("example")}
        fallback={
          <AnglePhotoSlot angle={activeAngle} label={label} photoUrl={null} uploading={uploading} mode="library" onSelectFile={uploadAndAdvance} variant="current" />
        }
      />
    );
  }

  // Gallery / assisted upload for this angle (still gated behind the Example).
  const guide = BODY_PROGRESS_GUIDE_BY_ANGLE[activeAngle];
  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title={`📷 ${label}`} subtitle={`第 ${stepText} 张`} backHref={reviewHref} />

      <div className="flex flex-col items-center gap-4 py-2">
        <figure className="w-56 max-w-full">
          <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={guide.src} alt={`${label}参考示范`} className="h-full w-full object-cover" />
          </div>
          <figcaption className="mt-1 text-center text-xs text-slate-400">参考示范</figcaption>
        </figure>

        <AnglePhotoSlot angle={activeAngle} label={label} photoUrl={null} uploading={uploading} mode="library" onSelectFile={uploadAndAdvance} variant="current" />

        <p className="max-w-xs text-center text-xs text-slate-400">照着示范的角度拍摄，方便日后对比</p>
      </div>

      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <Link href={reviewHref} className="py-1 text-center text-sm font-medium text-slate-400 transition hover:text-slate-600">
        返回检查
      </Link>
    </div>
  );
}
