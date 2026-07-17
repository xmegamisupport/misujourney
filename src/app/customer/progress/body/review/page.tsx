"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useJourneySummary } from "@/lib/journey";
import { useTodayCheckIn, useCustomerCheckIns } from "@/lib/inventory/hooks";
import {
  getBodyProgressPhotoSignedUrl,
  listUploadedBodyProgressPhotos,
  submitBodyProgress,
  type UploadedBodyProgressPhoto,
} from "@/lib/bodyProgress/engine";
import { BODY_PROGRESS_ANGLES, BODY_PROGRESS_CYCLE_DAYS } from "@/lib/bodyProgress/constants";
import type { BodyProgressAngle, SubmitBodyProgressResult } from "@/lib/bodyProgress/types";

const ANGLE_LABELS: Record<BodyProgressAngle, string> = { front: "正面", left: "左侧", right: "右侧", back: "背面" };

function formatMonthDay(dateStr: string): string {
  const [, month, day] = dateStr.slice(0, 10).split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export default function BodyProgressReviewPage() {
  return (
    <Suspense>
      <BodyProgressReviewContent />
    </Suspense>
  );
}

function BodyProgressReviewContent() {
  const searchParams = useSearchParams();
  const recordId = searchParams.get("recordId");
  const from = searchParams.get("from");
  const isBaseline = from === "baseline";
  const fromSuffix = from ? `&from=${from}` : "";
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";

  const { data: journey } = useJourneySummary(customerId);
  const { data: todayCheckIn } = useTodayCheckIn(customerId);
  const { data: allCheckIns } = useCustomerCheckIns(customerId);
  const latestCheckIn = todayCheckIn ?? allCheckIns[0];

  const [photos, setPhotos] = useState<UploadedBodyProgressPhoto[]>([]);
  const [urls, setUrls] = useState<Partial<Record<BodyProgressAngle, string | null>>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitBodyProgressResult | null>(null);

  useEffect(() => {
    if (!customerId || !recordId) return;
    let cancelled = false;
    listUploadedBodyProgressPhotos(customerId, recordId).then(async (uploaded) => {
      if (cancelled) return;
      setPhotos(uploaded);
      const entries = await Promise.all(uploaded.map(async (p) => [p.angle, await getBodyProgressPhotoSignedUrl(p.path)] as const));
      if (!cancelled) {
        setUrls(Object.fromEntries(entries));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, recordId]);

  // A retake reopens ONLY that angle's Example → Camera and returns here; the
  // other three photos are left untouched.
  function retakeHref(angle: BodyProgressAngle): string {
    return `/customer/progress/body/capture?recordId=${recordId}&mode=camera&retake=${angle}${fromSuffix}`;
  }

  async function handleSubmit() {
    if (!recordId || submitting) return;
    setSubmitting(true);
    setError(null);
    const submitResult = await submitBodyProgress({
      recordId,
      photos: photos.map((p) => ({ angle: p.angle, ext: p.ext })),
    });
    if (!submitResult.ok || !submitResult.data) {
      setSubmitting(false);
      setError(submitResult.error ?? "提交失败，请重试");
      return;
    }
    setResult(submitResult.data);
  }

  if (!recordId) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
        <PageHeader title="确认提交" backHref="/customer/progress/body" />
        <p className="text-sm text-slate-500">缺少记录信息，请重新开始。</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
        <PageHeader title="记录完成" />
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 text-center">
          <span className="text-4xl">🎉</span>
          <p className="text-base font-semibold text-slate-800">又完成了一个里程碑</p>
          <p className="text-sm text-slate-600">谢谢你愿意持续记录、持续投入自己的健康。</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Journey Day</p>
              <p className="text-lg font-semibold text-slate-900">{result.journeyDay}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">下一次记录</p>
              <p className="text-lg font-semibold text-slate-900">{BODY_PROGRESS_CYCLE_DAYS} 天后</p>
            </div>
          </div>
        </div>

        {isBaseline ? (
          <>
            {/* Entered from the Journey Baseline flow — keep momentum: return to
                the baseline hub (updated status) rather than the Dashboard. */}
            <Link href="/customer/journey-start?saved=1" className="rounded-2xl bg-emerald-500 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600">
              继续建立 Journey 起点 →
            </Link>
            <Link href="/customer" className="rounded-2xl border border-slate-200 bg-white py-3.5 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-200">
              先回首页
            </Link>
          </>
        ) : (
          <>
            <Link href="/customer" className="rounded-2xl bg-emerald-500 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600">
              继续今天的 Journey
            </Link>
            <Link href="/customer/progress/body/history" className="rounded-2xl border border-slate-200 bg-white py-3.5 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-200">
              查看我的成长记录
            </Link>
          </>
        )}
      </div>
    );
  }

  const allPresent = photos.length === BODY_PROGRESS_ANGLES.length;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="确认提交" backHref="/customer/progress/body" />

      {!loading && (
        <div className="grid grid-cols-2 gap-4">
          {BODY_PROGRESS_ANGLES.map((angle) => {
            const photoUrl = urls[angle] ?? null;
            return (
              <div key={angle} className="flex flex-col gap-2">
                <div
                  className={`relative aspect-[3/4] overflow-hidden rounded-2xl border-2 ${photoUrl ? "border-emerald-300" : "border-dashed border-slate-200"} bg-slate-50`}
                >
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={ANGLE_LABELS[angle]} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-4xl text-slate-300">🧍</span>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">{ANGLE_LABELS[angle]}</span>
                  {photoUrl && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-white">✓</span>
                  )}
                </div>
                <Link
                  href={retakeHref(angle)}
                  className="rounded-xl border border-slate-200 py-2 text-center text-sm font-medium text-slate-600 transition hover:border-emerald-200 hover:text-emerald-600"
                >
                  {photoUrl ? "✏️ 重拍" : "去拍摄"}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">体重快照</p>
            <p className="text-base font-semibold text-slate-900">{latestCheckIn ? `${latestCheckIn.weight}kg` : "暂无"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">体重记录日期</p>
            <p className="text-base font-semibold text-slate-900">{latestCheckIn ? formatMonthDay(latestCheckIn.date) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">提交日期</p>
            <p className="text-base font-semibold text-slate-900">今天</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Journey Day</p>
            <p className="text-base font-semibold text-slate-900">{journey?.currentDay ?? "—"}</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <button
        type="button"
        disabled={!allPresent || submitting}
        onClick={handleSubmit}
        className="rounded-2xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
      >
        {submitting ? "提交中..." : "提交记录"}
      </button>
    </div>
  );
}
