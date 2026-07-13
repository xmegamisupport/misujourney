"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { cn } from "@/lib/utils";
import {
  calculateBMI,
  calculateWeightGoalRange,
  canSuggestWeightLoss,
  evaluateGoalStatus,
  isCustomLossWithinRange,
  validateLongTermGoal,
} from "@/lib/goals/goal-calculator";
import { DIET_TYPE_LABELS, ACTIVITY_LEVEL_LABELS, GOAL_TYPE_LABELS, GOAL_TYPE_ICONS, JOURNEY_PLAN_OPTIONS } from "@/lib/goals/constants";
import { completeRegistrationGoals, type CompleteRegistrationGoalsResult } from "@/lib/goals/engine";
import { useWeightGoalRules } from "@/lib/goals/hooks";
import type { ActivityLevel, DietType, GoalStatus, GoalType, JourneyDays, WeightGoalRange } from "@/lib/goals/types";

const TOTAL_STEPS = 5;

/** goal_type is stored as a single enum column, but the wizard now lets the
 * customer pick more than one — lose_weight always wins (it's the only
 * selection that drives a numeric target), otherwise the first pick applies
 * since every other goal type behaves identically (habit-based maintain). */
function deriveEffectiveGoalType(goalTypes: GoalType[]): GoalType | "" {
  if (goalTypes.includes("lose_weight")) return "lose_weight";
  return goalTypes[0] ?? "";
}

interface WizardDraft {
  name: string;
  age: string;
  gender: "female" | "male";
  phone: string;
  referralCode: string;
  height: string;
  currentWeight: string;
  dietType: DietType | "";
  activityLevel: ActivityLevel | "";
  goalTypes: GoalType[];
  journeyDays: JourneyDays | 0;
  longTermGoalWeight: string;
  useCustomGoal: boolean;
  customLossKg: string;
}

const EMPTY_DRAFT: WizardDraft = {
  name: "",
  age: "",
  gender: "female",
  phone: "",
  referralCode: "",
  height: "",
  currentWeight: "",
  dietType: "",
  activityLevel: "",
  goalTypes: [],
  journeyDays: 0,
  longTermGoalWeight: "",
  useCustomGoal: false,
  customLossKg: "",
};

const DRAFT_STORAGE_KEY = "misu-onboarding-draft";

/** Safe to call synchronously in a lazy useState initializer: OnboardingWizard
 * only ever mounts client-side (see OnboardingPage's loading gate above), so
 * there is no server-rendered version of this subtree to hydration-mismatch
 * against — same pattern as the meal-check confirm/result pages. */
function readStoredDraft(defaultName: string): { step: number; draft: WizardDraft } {
  if (typeof window === "undefined") return { step: 1, draft: { ...EMPTY_DRAFT, name: defaultName } };
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return { step: 1, draft: { ...EMPTY_DRAFT, name: defaultName } };
    const parsed = JSON.parse(raw) as { step: number; draft: WizardDraft };
    return { step: parsed.step ?? 1, draft: { ...EMPTY_DRAFT, ...parsed.draft } };
  } catch {
    return { step: 1, draft: { ...EMPTY_DRAFT, name: defaultName } };
  }
}

export default function OnboardingPage() {
  const { user, loading: userLoading } = useAuthUser();

  if (userLoading || !user) {
    return <div className="px-4 py-10 text-center text-sm text-slate-400">加载中...</div>;
  }

  return <OnboardingWizard customerId={user.id} defaultName={user.name} />;
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center gap-1.5">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            n <= step ? "bg-emerald-500" : "bg-slate-100",
          )}
        />
      ))}
    </div>
  );
}

function OnboardingWizard({ customerId, defaultName }: { customerId: string; defaultName: string }) {
  const router = useRouter();
  const initial = useState(() => readStoredDraft(defaultName ?? ""))[0];
  const [step, setStep] = useState(initial.step);
  const [draft, setDraft] = useState<WizardDraft>(initial.draft);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CompleteRegistrationGoalsResult | null>(null);
  const { data: weightGoalRules } = useWeightGoalRules();

  // Auto-save: every step/field change is persisted so a refresh mid-wizard
  // doesn't lose progress. Cleared once the RPC actually submits.
  useEffect(() => {
    if (result) return;
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ step, draft }));
  }, [step, draft, result]);

  function update<K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const height = Number(draft.height);
  const currentWeight = Number(draft.currentWeight);
  const age = Number(draft.age);
  const hasBasicNumbers = height > 0 && currentWeight > 0 && age > 0;

  const bmi = hasBasicNumbers ? calculateBMI(height, currentWeight) : null;
  const effectiveGoalType = deriveEffectiveGoalType(draft.goalTypes);

  const longTermGoalWeight = draft.longTermGoalWeight.trim() ? Number(draft.longTermGoalWeight) : null;
  const longTermGoalValid = longTermGoalWeight === null || (height > 0 && validateLongTermGoal(longTermGoalWeight, height));

  const goalStatus: GoalStatus | null = useMemo(() => {
    if (bmi === null || !effectiveGoalType) return null;
    return evaluateGoalStatus({
      heightCm: height,
      currentWeightKg: currentWeight,
      age,
      bmi,
      goalType: effectiveGoalType,
      longTermGoalWeightKg: longTermGoalWeight,
    });
  }, [bmi, currentWeight, height, age, effectiveGoalType, longTermGoalWeight]);

  const canSuggestLoss = bmi !== null && goalStatus !== null && effectiveGoalType === "lose_weight" && canSuggestWeightLoss({ bmi, goalType: effectiveGoalType, goalStatus });

  const weightGoalRange: WeightGoalRange | null = useMemo(() => {
    if (!canSuggestLoss || !draft.journeyDays) return null;
    return calculateWeightGoalRange(weightGoalRules, currentWeight, draft.journeyDays);
  }, [weightGoalRules, canSuggestLoss, currentWeight, draft.journeyDays]);

  const customLossKg = draft.customLossKg.trim() ? Number(draft.customLossKg) : null;
  const customWithinRange = weightGoalRange && customLossKg !== null && customLossKg > 0 ? isCustomLossWithinRange(customLossKg, weightGoalRange) : null;

  const finalTarget = useMemo(() => {
    if (!canSuggestLoss) return { min: currentWeight, max: currentWeight };
    if (draft.useCustomGoal && customLossKg !== null && customLossKg > 0) {
      const t = Math.round((currentWeight - customLossKg) * 10) / 10;
      return { min: t, max: t };
    }
    if (weightGoalRange) return { min: weightGoalRange.minTargetWeightKg, max: weightGoalRange.maxTargetWeightKg };
    return { min: currentWeight, max: currentWeight };
  }, [canSuggestLoss, draft.useCustomGoal, customLossKg, currentWeight, weightGoalRange]);

  function validateStep(): string | null {
    if (step === 1) {
      if (!draft.name.trim()) return "请输入姓名";
      if (!draft.age || age <= 0) return "请输入年龄";
      if (!draft.phone.trim()) return "请输入电话号码";
      if (!draft.height || height <= 0) return "请输入身高";
      if (!draft.currentWeight || currentWeight <= 0) return "请输入当前体重";
      if (!draft.dietType) return "请选择饮食类型";
      if (!draft.activityLevel) return "请选择活动量";
    }
    if (step === 2 && draft.goalTypes.length === 0) return "请选择主要目标";
    if (step === 4 && !draft.journeyDays) return "请选择 MISU JOURNEY 计划";
    return null;
  }

  function goNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit() {
    if (canSuggestLoss && draft.useCustomGoal && (customLossKg === null || customLossKg <= 0)) {
      setError("请输入自订减重公斤数目");
      return;
    }
    setError(null);
    setSubmitting(true);
    const submitResult = await completeRegistrationGoals({
      customerId,
      name: draft.name.trim(),
      height,
      currentWeight,
      age,
      gender: draft.gender,
      phone: draft.phone.trim(),
      dietType: draft.dietType as DietType,
      activityLevel: draft.activityLevel as ActivityLevel,
      goalType: effectiveGoalType as GoalType,
      journeyDays: draft.journeyDays as JourneyDays,
      longTermGoalWeight: longTermGoalWeight ?? undefined,
      referralCode: draft.referralCode.trim() || undefined,
      useCustomGoal: canSuggestLoss && draft.useCustomGoal,
      customLossKg: customLossKg ?? undefined,
    });
    setSubmitting(false);
    if (!submitResult.ok || !submitResult.data) {
      setError(submitResult.error ?? "提交失败，请重试");
      return;
    }
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    setResult(submitResult.data);
  }

  if (result) {
    return <OnboardingResult result={result} onStart={() => router.push("/customer")} />;
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🌱</span>
          <h1 className="text-xl font-semibold text-slate-900">开启你的 Journey</h1>
          <p className="text-sm text-emerald-600">Every Day Is A New Journey</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <StepIndicator step={step} />

          {step === 1 && <StepBasicInfo draft={draft} update={update} />}
          {step === 2 && <StepGoalType draft={draft} update={update} />}
          {step === 3 && (
            <StepLongTermGoal
              value={draft.longTermGoalWeight}
              onChange={(v) => update("longTermGoalWeight", v)}
              valid={longTermGoalValid}
            />
          )}
          {step === 4 && <StepJourneyPlan draft={draft} update={update} />}
          {step === 5 && (
            <StepStageGoal
              currentWeight={currentWeight}
              canSuggestLoss={canSuggestLoss}
              weightGoalRange={weightGoalRange}
              finalTarget={finalTarget}
              draft={draft}
              update={update}
              customWithinRange={customWithinRange}
              journeyDays={draft.journeyDays}
            />
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className="rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一步
            </button>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                下一步
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !longTermGoalValid}
                className="rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
              >
                {submitting ? "提交中..." : "完成设置"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-sm text-slate-600">{children}</label>;
}

const inputClass =
  "rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

function StepBasicInfo({ draft, update }: { draft: WizardDraft; update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-900">Step 1 · 填写基础资料</h2>
      <FieldLabel>
        姓名
        <input value={draft.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
      </FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel>
          年龄
          <input type="number" inputMode="numeric" value={draft.age} onChange={(e) => update("age", e.target.value)} className={inputClass} />
        </FieldLabel>
        <FieldLabel>
          性别
          <select value={draft.gender} onChange={(e) => update("gender", e.target.value as "female" | "male")} className={inputClass}>
            <option value="female">女</option>
            <option value="male">男</option>
          </select>
        </FieldLabel>
      </div>
      <FieldLabel>
        电话号码
        <input value={draft.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+60 1x-xxx xxxx" className={inputClass} />
      </FieldLabel>
      <FieldLabel>
        Referral Code（选填）
        <input value={draft.referralCode} onChange={(e) => update("referralCode", e.target.value)} placeholder="CHLOE688" className={inputClass} />
      </FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel>
          身高 (cm)
          <input type="number" inputMode="decimal" value={draft.height} onChange={(e) => update("height", e.target.value)} className={inputClass} />
        </FieldLabel>
        <FieldLabel>
          当前体重 (kg)
          <input type="number" inputMode="decimal" value={draft.currentWeight} onChange={(e) => update("currentWeight", e.target.value)} className={inputClass} />
        </FieldLabel>
      </div>
      <FieldLabel>
        饮食类型
        <select value={draft.dietType} onChange={(e) => update("dietType", e.target.value as DietType)} className={inputClass}>
          <option value="" disabled>请选择</option>
          {(Object.entries(DIET_TYPE_LABELS) as [DietType, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel>
        活动量
        <select value={draft.activityLevel} onChange={(e) => update("activityLevel", e.target.value as ActivityLevel)} className={inputClass}>
          <option value="" disabled>请选择</option>
          {(Object.entries(ACTIVITY_LEVEL_LABELS) as [ActivityLevel, string][]).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </FieldLabel>
    </div>
  );
}

function StepGoalType({ draft, update }: { draft: WizardDraft; update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void }) {
  function toggle(value: GoalType) {
    update("goalTypes", draft.goalTypes.includes(value) ? draft.goalTypes.filter((g) => g !== value) : [...draft.goalTypes, value]);
  }
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-900">Step 2 · 选择主要目标</h2>
      <p className="text-xs text-slate-400">可以选择一个或多个目标</p>
      <div className="grid grid-cols-2 gap-3">
        {(Object.entries(GOAL_TYPE_LABELS) as [GoalType, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border px-3 py-5 text-center text-sm font-medium transition",
              draft.goalTypes.includes(value) ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-500 hover:border-slate-200",
            )}
          >
            <span className="text-2xl">{GOAL_TYPE_ICONS[value]}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepJourneyPlan({ draft, update }: { draft: WizardDraft; update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-900">Step 4 · 选择 MISU JOURNEY 计划</h2>
      <div className="flex flex-col gap-3">
        {JOURNEY_PLAN_OPTIONS.map((option) => (
          <button
            key={option.days}
            type="button"
            onClick={() => update("journeyDays", option.days)}
            className={cn(
              "flex items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-medium transition",
              draft.journeyDays === option.days ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-500 hover:border-slate-200",
            )}
          >
            {option.label}
            {option.recommended && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">推荐</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatRange(min: number, max: number): string {
  return Math.abs(min - max) < 0.05 ? `${min}` : `${min} ~ ${max}`;
}

function StepStageGoal({
  currentWeight,
  canSuggestLoss,
  weightGoalRange,
  finalTarget,
  draft,
  update,
  customWithinRange,
  journeyDays,
}: {
  currentWeight: number;
  canSuggestLoss: boolean;
  weightGoalRange: WeightGoalRange | null;
  finalTarget: { min: number; max: number };
  draft: WizardDraft;
  update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
  customWithinRange: boolean | null;
  journeyDays: JourneyDays | 0;
}) {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const showWarning = customWithinRange === false && !warningDismissed;

  if (!currentWeight || !journeyDays) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-slate-900">Step 5 · 第一阶段目标建议</h2>
        <p className="text-sm text-slate-400">请先完成前面几步</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-900">Step 5 · 第一阶段目标建议</h2>

      {!canSuggestLoss ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-center">
          <p className="text-xs text-slate-500">目前 {currentWeight}kg</p>
          <p className="mt-1 text-sm font-medium text-emerald-700">第一阶段目标</p>
          <p className="text-xl font-semibold text-slate-900">维持体重，专注习惯养成</p>
        </div>
      ) : weightGoalRange ? (
        <>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-center">
            <p className="text-xs text-slate-500">根据你的资料，我们建议第一阶段目标：</p>
            <p className="mt-3 text-xs font-medium text-slate-500">减重</p>
            <p className="text-2xl font-semibold text-slate-900">{formatRange(weightGoalRange.minLossKg, weightGoalRange.maxLossKg)}kg</p>
            <p className="mt-3 text-xs font-medium text-slate-500">预计体重</p>
            <p className="text-2xl font-semibold text-slate-900">{formatRange(weightGoalRange.minTargetWeightKg, weightGoalRange.maxTargetWeightKg)}kg</p>
            <p className="mt-3 text-xs text-slate-400">这个目标属于健康且较容易坚持的减重速度。实际成果会受到饮食、睡眠、运动、执行率及个人体质影响。</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update("useCustomGoal", false)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                !draft.useCustomGoal ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:border-slate-300",
              )}
            >
              使用系统建议
            </button>
            <button
              type="button"
              onClick={() => {
                update("useCustomGoal", true);
                setWarningDismissed(false);
              }}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                draft.useCustomGoal ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:border-slate-300",
              )}
            >
              自订目标
            </button>
          </div>

          {draft.useCustomGoal && (
            <div className="flex flex-col gap-3">
              <FieldLabel>
                自订减重目标(kg)-第一阶段
                <input
                  type="number"
                  inputMode="decimal"
                  value={draft.customLossKg}
                  onChange={(e) => {
                    update("customLossKg", e.target.value);
                    setWarningDismissed(false);
                  }}
                  placeholder={`例如 ${weightGoalRange.minLossKg}`}
                  className={inputClass}
                />
              </FieldLabel>
              {showWarning && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <p>⚠️ 这个目标已经超出系统建议范围。</p>
                  <p className="mt-1">为了健康及更高成功率，我们建议第一阶段目标维持在 {formatRange(weightGoalRange.minLossKg, weightGoalRange.maxLossKg)}kg。</p>
                  <p className="mt-1">你仍然可以继续使用自己的目标。</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWarningDismissed(true)}
                      className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs font-semibold text-amber-700"
                    >
                      继续使用我的目标
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        update("useCustomGoal", false);
                        update("customLossKg", "");
                      }}
                      className="rounded-lg bg-amber-500 px-2 py-1.5 text-xs font-semibold text-white"
                    >
                      改用系统建议
                    </button>
                  </div>
                </div>
              )}
              {customWithinRange !== false && customLossKgValid(draft.customLossKg) && (
                <p className="text-center text-xs text-slate-500">预计体重 {finalTarget.min}kg</p>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-400">目前体重区间暂无建议规则，请联系客服。</p>
      )}

      <p className="text-xs text-slate-400">建议先完成第一阶段，再继续下一阶段。</p>
    </div>
  );
}

function customLossKgValid(value: string): boolean {
  const n = Number(value);
  return value.trim() !== "" && n > 0;
}

function StepLongTermGoal({ value, onChange, valid }: { value: string; onChange: (v: string) => void; valid: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-900">Step 3 · 最终目标（可选）</h2>
      <p className="text-sm text-slate-500">如果你希望填写最终理想体重，可以填写。这不会直接成为当前执行目标，会在你完成第一阶段后重新规划。</p>
      <FieldLabel>
        最终目标体重 (kg)
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="选填"
          className={inputClass}
        />
      </FieldLabel>
      {!valid && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          这个长期目标偏低，我们会把你的第一阶段目标改为习惯养成，而不是体重目标。
        </div>
      )}
    </div>
  );
}

function OnboardingResult({ result, onStart }: { result: CompleteRegistrationGoalsResult; onStart: () => void }) {
  const statusCopy: Record<string, { title: string; body: string }> = {
    auto_approved: { title: "目标已确认", body: "你的第一阶段目标已经设定好，随时可以开始。" },
    auto_adjusted: { title: "已为你拆分为阶段目标", body: "长期目标已保存作为未来参考，我们先从第一阶段开始。" },
    goal_restricted: { title: "已切换为习惯养成目标", body: "这个阶段我们先专注在饮食、饮水与打卡习惯，而不是体重数字。" },
  };
  const copy = statusCopy[result.goalStatus] ?? statusCopy.auto_approved;
  const isMaintain = Math.abs(result.stageGoalWeightMin - result.stageGoalWeightMax) < 0.05 && result.goalStatus === "goal_restricted";

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-3xl">🎯</span>
        <p className="text-lg font-semibold text-slate-900">{copy.title}</p>
        <p className="mt-1 text-sm text-slate-500">{copy.body}</p>

        {!isMaintain && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-xs text-slate-500">第一阶段目标{result.isCustomGoal ? "（自订）" : ""}</p>
            <p className="text-2xl font-semibold text-slate-900">{formatRange(result.stageGoalWeightMin, result.stageGoalWeightMax)}kg</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
          <p>✓ {result.targetCheckInDays} 天打卡</p>
          <p>✓ {result.target211Meals} 餐 211 餐盘</p>
          <p>✓ {result.targetWaterDays} 天饮水达标</p>
          <p>✓ {result.targetMisuDays} 天 MISU 打卡</p>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-6 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          开始 Journey →
        </button>
      </div>
    </div>
  );
}
