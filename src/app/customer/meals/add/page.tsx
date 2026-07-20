"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { mealTypeOptions, mealTypeIcon, mealTypeLabel } from "@/lib/meal-types";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useTodayJourneyDay } from "@/lib/journey-day/hooks";
import { todayDateStr } from "@/lib/inventory/engine";
import { compressPhoto } from "@/lib/image-compress";
import type { MealDetectionDraft } from "@/lib/meal-check/types";
import type { FoodCategory } from "@/lib/food-portions/types";

interface DetectionResponse {
  misuDetected: { productCode: "MISU_N_PLUS" | "MISU_DX_PLUS"; quantityGuess: number }[];
  foodItems: { name: string; category: FoodCategory }[];
}

const DEFAULT_MEAL_TYPE = "lunch";

/** Which meal this is comes from the link that opened the page — the customer
 * already answered that question by tapping a meal card on 今日饮食, and asking
 * again was the whole reason the old intermediate step existed. An unknown or
 * missing value falls back rather than blocking: a bad link should still let
 * her record something. */
function resolveMealType(raw: string | null): string {
  return mealTypeOptions.some((t) => t.key === raw) ? (raw as string) : DEFAULT_MEAL_TYPE;
}

export default function AddMealPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 md:px-8" />}>
      <AddMealForm />
    </Suspense>
  );
}

function AddMealForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mealType = resolveMealType(searchParams.get("type"));

  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const today = todayDateStr();
  const { data: todayJourney, loading: journeyLoading } = useTodayJourneyDay(customerId, today);
  const journeyActive = (todayJourney?.status ?? "waiting_for_morning") === "active";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A failed analysis and an unusable photo need different exits. A network
  // error is worth retrying with the same picture; a photo with no food in it
  // never becomes one, so re-analysing it just fails again in the same way.
  const [needsRetake, setNeedsRetake] = useState(false);

  if (!journeyLoading && !journeyActive) {
    return (
      <div className="px-4 py-10 md:px-8">
        <PageHeader title={`记录${mealTypeLabel(mealType)}`} backHref="/customer/meals" />
        <EmptyState
          icon="🌱"
          title="今天的 Journey 还没开始"
          description="请先回到首页完成或跳过晨重，再来记录这一餐。"
          action={
            <Link href="/customer" className="text-sm font-medium text-emerald-600">
              返回首页 →
            </Link>
          }
        />
      </div>
    );
  }

  // Compress once, here — the SAME image is then sent to the vision model and
  // kept for the coach. If the coach reviewed a sharper picture than the AI was
  // given, a misread would look like an AI failure when it was really a
  // resolution difference. What she reviews is exactly what it saw.
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    // Clearing the value lets her pick the SAME file again — otherwise onChange
    // never fires for a repeat selection and the button looks broken.
    input.value = "";
    if (!file) return;
    setError(null);
    setNeedsRetake(false);
    setCompressing(true);
    const { blob, url } = await compressPhoto(file);
    setPhoto(url);
    setPhotoBlob(blob);
    setCompressing(false);
  }

  async function handleAnalyze() {
    if (!photoBlob) return;
    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", photoBlob, "meal.jpg");
      formData.append("mealType", mealType);

      const res = await fetch("/api/analyze-meal", { method: "POST", body: formData });
      const data: DetectionResponse & { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "分析失败，请重试");
      }

      // Nothing recognised at all — a photo of a desk, a wall, a pet. Stop here
      // rather than continuing to the confirm step, where food can be added by
      // hand: that field exists to correct a meal the AI misread, not to invent
      // one from a photo with no food in it. The rule is deliberately narrow —
      // manual items may SUPPLEMENT a recognised meal, never create one.
      const misuCount = (data.misuDetected ?? []).filter((m) => m.quantityGuess > 0).length;
      const foodCount = (data.foodItems ?? []).length;
      if (misuCount + foodCount === 0) {
        setAnalyzing(false);
        setNeedsRetake(true);
        setError("没有辨识到食物。请确认这一餐的食物都在照片里，光线清楚一点会更准。");
        return;
      }

      const draft: MealDetectionDraft = {
        mealType,
        photo: photo ?? undefined,
        misuTags: (data.misuDetected ?? [])
          .filter((m) => m.quantityGuess > 0)
          .map((m) => ({ productCode: m.productCode, quantity: Math.round(m.quantityGuess) })),
        foodItems: (data.foodItems ?? []).map((f) => ({
          id: `food_${crypto.randomUUID()}`,
          name: f.name,
          category: f.category,
        })),
      };

      sessionStorage.setItem("misu-meal-detection", JSON.stringify(draft));
      router.push("/customer/meals/confirm");
    } catch (err) {
      setAnalyzing(false);
      setError(err instanceof Error ? err.message : "分析失败，请重试");
    }
  }

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
        <p className="text-base font-semibold text-slate-800">AI 分析中…</p>
        <p className="text-sm text-slate-400">正在识别 MISU 产品与其他食物，请稍候</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 md:px-8">
      <PageHeader
        title={`${mealTypeIcon(mealType)} ${mealTypeLabel(mealType)}`}
        subtitle="拍一张照片就好"
        backHref="/customer/meals"
      />

      <div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 text-emerald-600 transition hover:border-emerald-300"
        >
          {compressing ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-500" />
              <span className="text-sm font-medium">处理照片中…</span>
            </>
          ) : photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="食物照片预览" className="h-full w-full object-cover" />
          ) : (
            <>
              <span className="text-4xl">📷</span>
              <span className="text-sm font-medium">点击拍照 / 从相册选择</span>
            </>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>

      {/* Kept as a worked example rather than a rule: the AI reads the whole
          plate at once, and a customer who photographs items one at a time gets
          five weaker analyses instead of one good one. */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-sm font-medium text-slate-600">请把这一餐全部一起拍进去</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          例如：
          <br />
          MISU · 鸡蛋 · 牛奶 · 水果 · 白饭
        </p>
      </div>

      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-600">{error}</div>}

      {/* The only useful action after "no food in this photo" is a different
          photo. Re-running the same picture through the same model produces the
          same answer, so offering 开始 AI 分析 here is a dead end dressed up as
          a way forward. */}
      {needsRetake ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        >
          📷 重新拍照
        </button>
      ) : (
        <button
          type="button"
          disabled={!photo || compressing}
          onClick={handleAnalyze}
          className="rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          开始 AI 分析
        </button>
      )}
    </div>
  );
}
