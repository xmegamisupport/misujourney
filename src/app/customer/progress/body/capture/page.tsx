"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AnglePhotoSlot } from "@/components/bodyProgress/AnglePhotoSlot";
import { BodyOutlineOverlay } from "@/components/bodyProgress/BodyOutlineOverlay";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { uploadBodyProgressPhoto, listUploadedBodyProgressPhotos, getBodyProgressPhotoSignedUrl } from "@/lib/bodyProgress/engine";
import { BODY_PROGRESS_ANGLES } from "@/lib/bodyProgress/constants";
import type { BodyProgressAngle } from "@/lib/bodyProgress/types";

const ANGLE_LABELS: Record<BodyProgressAngle, string> = { front: "正面", left: "左侧", right: "右侧", back: "背面" };

/** One angle at a time, in fixed order — never four independent upload
 * boxes at once, so the customer always has a single clear "what do I do
 * next" prompt. Already-uploaded angles (from a resumed session) show as
 * small completed chips; getUploadedAngles/listUploadedBodyProgressPhotos
 * (Sprint 002) is what makes resuming mid-sequence possible without
 * re-asking for angles already done. */
export default function BodyProgressCapturePage() {
  return (
    <Suspense>
      <BodyProgressCaptureFlow />
    </Suspense>
  );
}

function BodyProgressCaptureFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("recordId");
  const mode = (searchParams.get("mode") as "camera" | "library" | null) ?? "library";
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";

  const [doneUrls, setDoneUrls] = useState<Partial<Record<BodyProgressAngle, string | null>>>({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId || !recordId) return;
    let cancelled = false;
    listUploadedBodyProgressPhotos(customerId, recordId).then(async (uploaded) => {
      if (cancelled) return;
      if (uploaded.length === BODY_PROGRESS_ANGLES.length) {
        router.replace(`/customer/progress/body/review?recordId=${recordId}`);
        return;
      }
      const urls = await Promise.all(uploaded.map(async (p) => [p.angle, await getBodyProgressPhotoSignedUrl(p.path)] as const));
      if (!cancelled) {
        setDoneUrls(Object.fromEntries(urls));
        setLoadingInitial(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, recordId, router]);

  if (!recordId) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
        <PageHeader title="身形记录" backHref="/customer/progress/body" />
        <p className="text-sm text-slate-500">缺少记录信息，请重新开始。</p>
      </div>
    );
  }

  const doneAngles = BODY_PROGRESS_ANGLES.filter((a) => doneUrls[a]);
  const currentAngle = BODY_PROGRESS_ANGLES.find((a) => !doneUrls[a]);
  const stepNumber = doneAngles.length + 1;

  async function handleSelectFile(file: File) {
    if (!currentAngle) return;
    setUploading(true);
    setError(null);
    const result = await uploadBodyProgressPhoto(customerId, recordId!, currentAngle, file);
    if (!result.ok) {
      setUploading(false);
      setError(result.error ?? "上传失败，请重试");
      return;
    }
    const url = await getBodyProgressPhotoSignedUrl(`${customerId}/${recordId}/${currentAngle}.${result.data!.ext}`);
    setUploading(false);
    setDoneUrls((prev) => {
      const next = { ...prev, [currentAngle]: url };
      const stillMissing = BODY_PROGRESS_ANGLES.some((a) => !next[a]);
      if (!stillMissing) {
        router.push(`/customer/progress/body/review?recordId=${recordId}`);
      }
      return next;
    });
  }

  if (loadingInitial) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
        <PageHeader title="身形记录" backHref="/customer/progress/body" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="身形记录" subtitle={`第 ${stepNumber} / 4 步`} backHref="/customer/progress/body" />

      {doneAngles.length > 0 && (
        <div className="flex gap-3">
          {doneAngles.map((angle) => (
            <AnglePhotoSlot key={angle} angle={angle} label={ANGLE_LABELS[angle]} photoUrl={doneUrls[angle] ?? null} uploading={false} variant="done" onSelectFile={() => {}} />
          ))}
        </div>
      )}

      {currentAngle && (
        <div className="flex flex-col items-center gap-4 py-2">
          <p className="text-base font-semibold text-slate-800">请拍摄：{ANGLE_LABELS[currentAngle]}</p>
          <div className="relative">
            <AnglePhotoSlot angle={currentAngle} label={ANGLE_LABELS[currentAngle]} photoUrl={null} uploading={uploading} mode={mode} onSelectFile={handleSelectFile} variant="current" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-56 -translate-x-1/2 text-slate-400">
              <BodyOutlineOverlay />
            </div>
          </div>
          <p className="max-w-xs text-center text-xs text-slate-400">身形轮廓仅作参考，不影响提交</p>
        </div>
      )}

      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <Link href={`/customer/progress/body/guide?recordId=${recordId}`} className="text-center text-sm text-sky-600">
        查看拍摄指南
      </Link>
    </div>
  );
}
