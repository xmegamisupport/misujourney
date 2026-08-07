"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressPhoto } from "@/lib/image-compress";
import { NutritionLabelSheet } from "@/components/meals/NutritionLabelSheet";
import { mealTypeLabel, mealTypeIcon } from "@/lib/meal-types";
import { FOOD_CATEGORY_OPTIONS } from "@/lib/food-portions/constants";
import type { MealDetectionDraft, FoodItemDraft } from "@/lib/meal-check/types";
import type { FoodCategory, SelectedPortion } from "@/lib/food-portions/types";
import type { NutritionLabelReading } from "@/lib/nutrition-label/types";

interface LibraryResolution {
  matched: boolean;
  foodId?: string;
  canonicalName?: string;
  plateCategory?: string | null;
  portion?: { gram: number; portionLabel: string; calories: number; protein: number; carbohydrate: number; fat: number; fiber: number };
}

interface DetectionResponse {
  misuDetected: { productCode: "MISU_N_PLUS" | "MISU_DX_PLUS"; quantityGuess: number }[];
  foodItems: { name: string; category: FoodCategory; library?: LibraryResolution }[];
}

function isFoodCategory(v: string | null | undefined): v is FoodCategory {
  return !!v && (FOOD_CATEGORY_OPTIONS as readonly string[]).includes(v);
}

/** Turn an AI food item into a draft item, applying the Food Library match when
 * the adapter found one (fixed nutrition, skips the portion picker). A miss —
 * or an empty library — yields exactly the previous behaviour (name + category). */
function toDraftItem(f: DetectionResponse["foodItems"][number]): FoodItemDraft {
  const base: FoodItemDraft = { id: `food_${crypto.randomUUID()}`, name: f.name, category: f.category };
  const lib = f.library;
  if (lib?.matched && lib.portion) {
    const category = isFoodCategory(lib.plateCategory) ? lib.plateCategory : f.category;
    return {
      ...base,
      name: lib.canonicalName ?? f.name,
      category,
      foodId: lib.foodId,
      portion: { category, ...lib.portion, isCustom: true, sourceNote: "来自 Food Library" },
    };
  }
  return base;
}

type ScanMode = "meal" | "barcode" | "label";
type Phase = "starting" | "live" | "denied" | "unsupported";

// A packaged label scanned on its own has no dish category the way a plate of
// rice + chicken does, so it defaults to the generic packaged bucket. The
// customer can add/adjust other foods on the Confirm step. (Phase 1: no
// category picker for a label-only item — noted in the report.)
const LABEL_DEFAULT_CATEGORY: FoodCategory = "dessert";

const MODES: { key: ScanMode; label: string }[] = [
  { key: "meal", label: "拍摄餐点" },
  { key: "barcode", label: "扫描条码" },
  { key: "label", label: "营养标签" },
];

const PROMPTS: Record<ScanMode, string> = {
  meal: "对准整份餐点，尽量拍完整",
  barcode: "将商品条码放入框内",
  label: "对准完整营养标签，确保文字清楚",
};

/** Corner brackets for the framing guide — four L-shapes at the corners of the
 * mode's capture area, rather than a full box, so the live preview stays clear. */
function Corners() {
  return (
    <>
      <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-xl border-l-2 border-t-2 border-white/85" />
      <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-xl border-r-2 border-t-2 border-white/85" />
      <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b-2 border-l-2 border-white/85" />
      <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-xl border-b-2 border-r-2 border-white/85" />
    </>
  );
}

/** Full-screen meal Scanner: one live camera, three switchable modes at the
 * bottom. Switching a mode never re-opens the camera — only the framing guide,
 * prompt and shutter behaviour change. 拍摄餐点 → /api/analyze-meal, 营养标签 →
 * the existing NutritionLabelSheet (/api/read-nutrition-label). 扫描条码 is a
 * front-end placeholder (shutter inactive) until the barcode backend lands.
 * Falls back to gallery/native-camera upload whenever the live camera can't run,
 * so capture always works. */
export function MealScanner({ mealType }: { mealType: string }) {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("starting");
  const [mode, setMode] = useState<ScanMode>("meal");
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [labelReading, setLabelReading] = useState<NutritionLabelReading | null>(null);

  // Acquire the rear camera once. Mode switches do NOT touch this stream.
  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setPhase("unsupported");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: false,
        });
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
            /* autoplay may need a tap; preview still renders */
          }
        }
        setPhase("live");
      } catch {
        if (!cancelled) setPhase("denied");
      }
    }
    acquire();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Re-attach the stream if the <video> element remounts.
  useEffect(() => {
    if (phase !== "live") return;
    const v = videoRef.current;
    const s = streamRef.current;
    if (v && s && v.srcObject !== s) {
      v.srcObject = s;
      v.play().catch(() => {});
    }
  }, [phase]);

  function exit() {
    router.push("/customer/meals");
  }

  /** Grab the visible (object-cover cropped) region as a JPEG File, so the saved
   * image matches exactly what the customer saw full-screen. Rear camera is
   * never mirrored. */
  async function grabFrame(): Promise<File | null> {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    const vw = video.videoWidth || 1080;
    const vh = video.videoHeight || 1920;
    const boxW = video.clientWidth || vw;
    const boxH = video.clientHeight || vh;
    // Reproduce object-cover: fill the box, cropping the overflow equally.
    const scale = Math.max(boxW / vw, boxH / vh);
    const cropW = Math.min(vw, boxW / scale);
    const cropH = Math.min(vh, boxH / scale);
    const sx = (vw - cropW) / 2;
    const sy = (vh - cropH) / 2;
    canvas.width = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return null;
    return new File([blob], "scan.jpg", { type: "image/jpeg" });
  }

  // 拍摄餐点 → existing analyze-meal → confirm flow (unchanged downstream).
  async function analyzeMeal(file: File) {
    setBusy(true);
    setBusyText("AI 分析中…");
    setError(null);
    try {
      const { blob, url } = await compressPhoto(file);
      const formData = new FormData();
      formData.append("photo", blob, "meal.jpg");
      formData.append("mealType", mealType);
      const res = await fetch("/api/analyze-meal", { method: "POST", body: formData });
      const data: DetectionResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "分析失败，请重试");

      const misuCount = (data.misuDetected ?? []).filter((m) => m.quantityGuess > 0).length;
      const foodCount = (data.foodItems ?? []).length;
      if (misuCount + foodCount === 0) {
        setBusy(false);
        setError("没有辨识到食物。请确认这一餐的食物都在画面里，光线清楚一点会更准。");
        return;
      }

      const draft: MealDetectionDraft = {
        mealType,
        photo: url,
        misuTags: (data.misuDetected ?? [])
          .filter((m) => m.quantityGuess > 0)
          .map((m) => ({ productCode: m.productCode, quantity: Math.round(m.quantityGuess) })),
        foodItems: (data.foodItems ?? []).map(toDraftItem),
      };
      sessionStorage.setItem("misu-meal-detection", JSON.stringify(draft));
      router.push("/customer/meals/confirm");
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "分析失败，请重试");
    }
  }

  // 营养标签 → run the existing /api/read-nutrition-label read here, then open
  // the existing NutritionLabelSheet on its "how much did you eat" step.
  async function startLabel(file: File) {
    setBusy(true);
    setBusyText("读取营养标签…");
    setError(null);
    try {
      const { blob } = await compressPhoto(file);
      const formData = new FormData();
      formData.append("photo", blob, "label.jpg");
      const res = await fetch("/api/read-nutrition-label", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "读取失败，请重试。请把整张营养标签拍清楚。");
      setLabelFile(file);
      setLabelReading(data as NutritionLabelReading);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  // Shutter behaviour is per-mode. Barcode has no shutter action yet.
  async function onShutter() {
    if (mode === "barcode") return;
    const file = await grabFrame();
    if (!file) {
      setError("拍摄失败，请重试或改用相册上传。");
      return;
    }
    if (mode === "meal") void analyzeMeal(file);
    else if (mode === "label") void startLabel(file);
  }

  // Gallery / native-camera fallback — routes by the active mode.
  function handleGalleryFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (mode === "meal") void analyzeMeal(file);
    else if (mode === "label") void startLabel(file);
  }

  // When a label was captured, the existing sheet takes over: it shows the
  // "how much did you eat" step, and on apply we build a one-item draft and
  // continue into the same Confirm flow.
  function onLabelApply(portion: SelectedPortion, productName: string) {
    const photoUrl = labelFile ? URL.createObjectURL(labelFile) : undefined;
    const draft: MealDetectionDraft = {
      mealType,
      photo: photoUrl,
      misuTags: [],
      foodItems: [
        {
          id: `food_${crypto.randomUUID()}`,
          name: productName || "包装食品",
          category: LABEL_DEFAULT_CATEGORY,
          portion,
        },
      ],
    };
    sessionStorage.setItem("misu-meal-detection", JSON.stringify(draft));
    setLabelFile(null);
    setLabelReading(null);
    router.push("/customer/meals/confirm");
  }

  const cameraDown = phase === "denied" || phase === "unsupported";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      {/* Live preview (rear camera, not mirrored). Hidden when the camera is down. */}
      {!cameraDown && (
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
      )}
      {cameraDown && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
          <span className="text-4xl">📷</span>
          <p className="text-sm font-medium text-white/90">
            {phase === "denied" ? "没有相机权限" : "此设备暂不支持实时相机"}
          </p>
          <p className="text-xs text-white/60">可用下方按钮从相册选择或用系统相机拍摄</p>
        </div>
      )}

      {/* Framing guide — changes with the mode, camera keeps running. */}
      {!cameraDown && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {mode === "meal" && (
            <div className="relative aspect-square w-[80%] max-w-sm">
              <Corners />
            </div>
          )}
          {mode === "label" && (
            <div className="relative aspect-[3/4] w-[66%] max-w-[15rem]">
              <Corners />
            </div>
          )}
          {mode === "barcode" && (
            <div className="relative h-24 w-[80%] max-w-sm rounded-xl border-2 border-white/85">
              <span className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-brand/80" />
            </div>
          )}
        </div>
      )}

      {/* Top bar: exit · meal type · gallery. */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pb-3 text-white"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)",
        }}
      >
        <button
          type="button"
          onClick={exit}
          aria-label="退出"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-lg active:bg-black/55"
        >
          ✕
        </button>
        <span className="text-sm font-semibold">
          {mealTypeIcon(mealType)} 记录{mealTypeLabel(mealType)}
        </span>
        {mode !== "barcode" ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="从相册选择"
            className="flex h-9 items-center gap-1.5 rounded-full bg-black/35 px-3 text-xs font-medium active:bg-black/55"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            相册
          </button>
        ) : (
          <span className="h-9 w-9" />
        )}
      </div>

      {/* Bottom stack: prompt · error · shutter · mode switcher. */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <span className="rounded-full bg-black/45 px-4 py-1.5 text-center text-[13px] font-medium text-white shadow-lg backdrop-blur">
          {PROMPTS[mode]}
        </span>

        {error && (
          <div className="max-w-sm rounded-2xl bg-rose-500/90 px-4 py-2.5 text-center text-xs leading-relaxed text-white shadow-lg">
            {error}
          </div>
        )}

        {mode === "barcode" && (
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/80">
            🔧 条码扫描开发中，敬请期待
          </span>
        )}

        {/* Shutter — active for 拍摄餐点 / 营养标签, inactive for 扫描条码. */}
        <button
          type="button"
          onClick={onShutter}
          disabled={mode === "barcode"}
          aria-label={mode === "barcode" ? "条码扫描暂未开放" : "拍摄"}
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/85 transition active:scale-95 disabled:opacity-35 disabled:active:scale-100"
        >
          <span className="h-12 w-12 rounded-full bg-white transition active:bg-white/80" />
        </button>

        {/* Mode switcher — three equal tabs, one row. Active = light/white bg +
            dark text; inactive = translucent dark + white text. */}
        <div className="flex w-full max-w-sm items-center gap-1 rounded-full bg-black/40 p-1 backdrop-blur">
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setMode(m.key);
                  setError(null);
                }}
                aria-pressed={active}
                className={`flex-1 whitespace-nowrap rounded-full py-2 text-center text-[13px] transition ${
                  active ? "bg-white font-semibold text-ink shadow-sm" : "font-medium text-white/80 active:text-white"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Busy overlay (analyze / label read). */}
      {busy && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/70 text-center">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/25 border-t-white" />
          <p className="text-base font-semibold text-white">{busyText}</p>
          <p className="text-sm text-white/60">正在识别 MISU 产品与其他食物，请稍候</p>
        </div>
      )}

      {/* Existing nutrition-label flow, opened on its amount step with the
          reading already done here. */}
      {labelReading && (
        <NutritionLabelSheet
          foodName="包装食品"
          category={LABEL_DEFAULT_CATEGORY}
          initialReading={labelReading}
          onClose={() => {
            setLabelFile(null);
            setLabelReading(null);
          }}
          onApply={onLabelApply}
        />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryFile} />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
