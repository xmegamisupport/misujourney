"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { mealTypeOptions } from "@/lib/meal-types";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { useTodayJourneyDay } from "@/lib/journey-day/hooks";
import { todayDateStr } from "@/lib/inventory/engine";
import type { MealDetectionDraft } from "@/lib/meal-check/types";
import type { FoodCategory } from "@/lib/food-portions/types";

interface DetectionResponse {
  misuDetected: { productCode: "MISU_N_PLUS" | "MISU_DX_PLUS"; quantityGuess: number }[];
  foodItems: { name: string; category: FoodCategory }[];
}

export default function AddMealPage() {
  const router = useRouter();
  const { user } = useAuthUser();
  const customerId = user?.id ?? "";
  const today = todayDateStr();
  const { data: todayJourney, loading: journeyLoading } = useTodayJourneyDay(customerId, today);
  const journeyActive = (todayJourney?.status ?? "waiting_for_morning") === "active";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mealType, setMealType] = useState("lunch");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!journeyLoading && !journeyActive) {
    return (
      <div className="px-4 py-10 md:px-8">
        <PageHeader title="记录食物" backHref="/customer" />
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

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(URL.createObjectURL(file));
      setPhotoFile(file);
      setError(null);
    }
  }

  async function handleAnalyze() {
    if (!photoFile) return;
    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("mealType", mealType);

      const res = await fetch("/api/analyze-meal", { method: "POST", body: formData });
      const data: DetectionResponse & { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "分析失败，请重试");
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
      <PageHeader title="记录食物" subtitle="Smart Meal Check" backHref="/customer" />

      <div>
        <p className="mb-2 text-sm font-medium text-slate-600">餐别</p>
        <div className="grid grid-cols-5 gap-2">
          {mealTypeOptions.map((type) => (
            <button
              key={type.key}
              type="button"
              onClick={() => setMealType(type.key)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border px-1 py-3 text-center text-xs font-medium transition",
                mealType === type.key ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-500",
              )}
            >
              <span className="text-lg">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-600">上传整餐照片</p>
        <p className="mb-2 text-xs text-slate-400">请把这一餐全部一起拍进去，例如 MISU、牛奶、鸡蛋、水果都入镜</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 text-emerald-600 transition hover:border-emerald-300"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="食物照片预览" className="h-full w-full object-cover" />
          ) : (
            <>
              <span className="text-4xl">📷</span>
              <span className="text-sm font-medium">点击拍照 / 从相册选择</span>
            </>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      )}

      <button
        type="button"
        disabled={!photo}
        onClick={handleAnalyze}
        className="rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        开始 AI 分析
      </button>
    </div>
  );
}
