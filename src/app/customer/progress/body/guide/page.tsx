"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhotoGuideExamples } from "@/components/bodyProgress/PhotoGuideExamples";

const PRACTICAL_TIPS = [
  "穿着合身或舒适贴身的衣物",
  "运动服装是很好的选择，但不是必须的",
  "避免过于宽松或厚重的衣物",
  "在光线明亮的环境拍摄",
  "手机镜头大约放在腰部高度",
  "自然放松地站立",
  "不需要刻意收腹",
  "保持全身都在画面中",
  "之后的记录尽量使用相似的衣着、姿势和拍摄角度",
];

/** Shown both as the forced first-time screen and as an optional
 * "查看拍摄指南" revisit later — same content either way, the only
 * difference is whether the customer arrived here automatically or chose
 * to. The three entry actions at the bottom are always available: the
 * product's "guide, don't force" principle means even a first-time visit
 * ends in a choice, never an automatic camera launch. */
export default function BodyProgressGuidePage() {
  return (
    <Suspense>
      <BodyProgressGuideContent />
    </Suspense>
  );
}

function BodyProgressGuideContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingRecordId = searchParams.get("recordId");

  function goToCapture(mode: "camera" | "library") {
    const recordId = existingRecordId || crypto.randomUUID();
    router.push(`/customer/progress/body/capture?recordId=${recordId}&mode=${mode}`);
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader title="拍摄指南" backHref="/customer/progress/body" />

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-sm leading-relaxed text-slate-700">
        <p>我们不是要评判你的身材。</p>
        <p className="mt-2">我们只是想帮你留下一个起点 —— 一个未来的你会感谢现在的你的起点。</p>
      </div>

      <PhotoGuideExamples />

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-700">拍摄小提示</p>
        <ul className="flex flex-col gap-2 text-sm text-slate-600">
          {PRACTICAL_TIPS.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span className="text-emerald-500">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => goToCapture("camera")}
          className="rounded-2xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        >
          📷 立即拍摄（推荐）
        </button>
        <button
          type="button"
          onClick={() => goToCapture("library")}
          className="rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200"
        >
          🖼 从相册上传
        </button>
        <button
          type="button"
          onClick={() => router.push("/customer")}
          className="py-2 text-center text-sm text-slate-400 transition hover:text-slate-600"
        >
          稍后再说
        </button>
      </div>
    </div>
  );
}
