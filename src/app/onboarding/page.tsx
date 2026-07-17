"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/lib/supabase/useAuthUser";
import { SignOutButton } from "@/components/SignOutButton";
import { cn } from "@/lib/utils";
import {
  calculateBMI,
  calculateWeightGoalRange,
  canSuggestWeightLoss,
  evaluateGoalStatus,
  isCustomLossWithinRange,
  validateLongTermGoal,
} from "@/lib/goals/goal-calculator";
import { DIET_TYPE_LABELS, ACTIVITY_LEVEL_LABELS, JOURNEY_PLAN_OPTIONS } from "@/lib/goals/constants";
import { completeRegistrationGoals, type CompleteRegistrationGoalsResult } from "@/lib/goals/engine";
import { useWeightGoalRules } from "@/lib/goals/hooks";
import { lookupCoachByReferral, type ReferralCoach } from "@/lib/referral";
import type { ActivityLevel, DietType, GoalStatus, GoalType, JourneyDays, WeightGoalRange } from "@/lib/goals/types";

const TOTAL_STEPS = 5;

/** Step 2 is now single-select, so goalTypes holds exactly one value
 * ([lose_weight] or [maintain_weight]); this returns it. The includes-check is
 * kept as a harmless safety net so any legacy multi-value draft still resolves
 * to lose_weight when present. Feeds goalStatus / canSuggestLoss and the
 * complete_registration_goals p_goal_type argument unchanged. */
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
  // 60 days is the guided default — preselected and highlighted in Step 4.
  journeyDays: 60,
  longTermGoalWeight: "",
  useCustomGoal: false,
  customLossKg: "",
};

const DRAFT_STORAGE_KEY = "misu-onboarding-draft";
/** Written by the registration page for a brand-new sign-up (same tab session).
 * Its presence means "fresh sign-up → skip the welcome-back screen"; its
 * absence means the customer is returning to finish (logged in later), so the
 * resume screen is shown. Must match the literal in src/app/register/page.tsx. */
const FRESH_SIGNUP_KEY = "misu_onboarding_fresh";

/** Safe to call synchronously in a lazy useState initializer: OnboardingWizard
 * only ever mounts client-side (see OnboardingPage's loading gate above), so
 * there is no server-rendered version of this subtree to hydration-mismatch
 * against — same pattern as the meal-check confirm/result pages. */
// Step 2 is now single-select over exactly these two directions. A draft saved
// by an earlier build (4-option multi-select) could carry a goal we no longer
// offer (e.g. improve_diet), which would silently drive Step 5 to maintenance.
const VALID_STEP2_GOALS: GoalType[] = ["lose_weight", "maintain_weight"];

function readStoredDraft(defaultName: string, defaultPhone: string | null, defaultReferral: string | null): { step: number; draft: WizardDraft } {
  // Name, phone and referral code are captured at registration and are the
  // source of truth here — they always win over any stored draft value and
  // the customer never re-enters them during onboarding. They still ride
  // through to complete_registration_goals so nothing is lost.
  const seed = (draft: WizardDraft): WizardDraft => ({
    ...draft,
    name: defaultName || draft.name,
    phone: defaultPhone ?? draft.phone,
    referralCode: defaultReferral ?? draft.referralCode,
  });
  // Drop any goal a legacy draft carried that isn't a current Step 2 option;
  // if that empties the selection, don't let the customer resume past Step 2
  // without re-choosing a valid direction.
  const sanitize = (step: number, draft: WizardDraft): { step: number; draft: WizardDraft } => {
    const goalTypes = draft.goalTypes.filter((g) => VALID_STEP2_GOALS.includes(g));
    return { step: goalTypes.length === 0 ? Math.min(step, 2) : step, draft: { ...draft, goalTypes } };
  };
  if (typeof window === "undefined") return sanitize(1, seed({ ...EMPTY_DRAFT }));
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return sanitize(1, seed({ ...EMPTY_DRAFT }));
    const parsed = JSON.parse(raw) as { step: number; draft: WizardDraft };
    return sanitize(parsed.step ?? 1, seed({ ...EMPTY_DRAFT, ...parsed.draft }));
  } catch {
    return sanitize(1, seed({ ...EMPTY_DRAFT }));
  }
}

export default function OnboardingPage() {
  const { user, loading: userLoading } = useAuthUser();

  if (userLoading || !user) {
    return <div className="px-4 py-10 text-center text-sm text-slate-400">加载中...</div>;
  }

  return <OnboardingWizard customerId={user.id} defaultName={user.name} defaultPhone={user.phone} defaultReferral={user.referralCode} />;
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

/** Shown when a customer returns to finish an account they created earlier —
 * welcoming, never framed as an error or an "incomplete Journey" (they haven't
 * started the Journey yet, only the profile). */
function ResumeWelcome({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-3xl">👋</span>
        <p className="text-lg font-semibold text-slate-900">欢迎回来</p>
        <p className="mt-2 text-sm text-slate-500">看起来你上次还没完成资料填写。没关系，我们一起继续完成吧。</p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          继续完成资料填写
        </button>
      </div>
    </div>
  );
}

function OnboardingWizard({ customerId, defaultName, defaultPhone, defaultReferral }: { customerId: string; defaultName: string; defaultPhone: string | null; defaultReferral: string | null }) {
  const initial = useState(() => readStoredDraft(defaultName ?? "", defaultPhone, defaultReferral))[0];
  // A brand-new sign-up carries the fresh marker (skip the welcome-back
  // screen); a customer returning to finish does not (show it). Read-only in
  // the initializer — the marker is left in place so a mid-onboarding refresh
  // stays "fresh" and only a real return (new tab session) triggers resume.
  const startedFresh = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem(FRESH_SIGNUP_KEY) !== null)[0];
  const [resumed, setResumed] = useState(startedFresh);
  const [step, setStep] = useState(initial.step);
  const [draft, setDraft] = useState<WizardDraft>(initial.draft);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CompleteRegistrationGoalsResult | null>(null);
  const [referralCoach, setReferralCoach] = useState<ReferralCoach | null>(null);
  const { data: weightGoalRules } = useWeightGoalRules();

  // Read-only confirmation of the bound Coach — the code itself is fixed from
  // sign-up and never edited here. lookupCoachByReferral() returns null for an
  // empty/invalid code, so state is only ever set from the async result.
  useEffect(() => {
    let cancelled = false;
    lookupCoachByReferral(draft.referralCode).then((coach) => {
      if (!cancelled) setReferralCoach(coach);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.referralCode]);

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
      // Name / phone are collected at registration and not re-asked here.
      // Bounds mirror isAbnormalInput() in goal-calculator: an out-of-range
      // value (e.g. height typed as 1.65 m, or a blank age) would otherwise
      // slip through and be silently downgraded to a restricted/maintenance
      // Step 5 goal with no explanation. Catch it here with a clear message.
      if (!draft.age || age < 13 || age > 100) return "请输入有效的年龄（13-100 岁）";
      if (!draft.height || height < 100 || height > 250) return "请输入有效的身高（100-250 cm）";
      if (!draft.currentWeight || currentWeight < 20 || currentWeight > 300) return "请输入有效的当前体重（20-300 kg）";
      if (!draft.dietType) return "请选择饮食类型";
      if (!draft.activityLevel) return "请选择活动量";
    }
    if (step === 2 && draft.goalTypes.length === 0) return "请选择一个方向";
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
    return <OnboardingResult result={result} />;
  }

  // Returning customer who created an account but never finished — welcome them
  // back before dropping them into the wizard. Fresh sign-ups skip this.
  if (!resumed) {
    return <ResumeWelcome onContinue={() => setResumed(true)} />;
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🌱</span>
          <h1 className="text-xl font-semibold text-slate-900">开启你的 Journey</h1>
          <p className="text-sm text-emerald-600">Every Day Is A New Journey</p>
        </div>

        <div className="mb-4 text-center">
          <p className="text-xs text-slate-400">
            不是你的账号？
            <SignOutButton className="ml-1 font-medium text-emerald-600 hover:underline" />
          </p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <StepIndicator step={step} />

          {step === 1 && <StepBasicInfo draft={draft} update={update} referralCoach={referralCoach} />}
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
              goalStatus={goalStatus}
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

// MVP: only 一般饮食 / 素食 are offered — the finer categories (蛋奶素/全素/其他)
// don't yet change any recommendation, so we don't ask users to distinguish
// them. The full DIET_TYPE_LABELS map is kept for displaying existing values.
const ONBOARDING_DIET_TYPES: DietType[] = ["regular", "vegetarian"];

function StepBasicInfo({ draft, update, referralCoach }: { draft: WizardDraft; update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void; referralCoach: ReferralCoach | null }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-900">Step 1 · 填写基础资料</h2>
      {referralCoach && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg">{referralCoach.avatar ?? "🌿"}</span>
          <p className="text-sm text-slate-700">
            你的专属 Coach：<span className="font-semibold text-emerald-700">{referralCoach.name}</span>
          </p>
        </div>
      )}
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
          {ONBOARDING_DIET_TYPES.map((value) => (
            <option key={value} value={value}>{DIET_TYPE_LABELS[value]}</option>
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

// Single-select direction. Two options only — kept as GoalType values so the
// whole existing pipeline (deriveEffectiveGoalType → goalStatus / canSuggestLoss
// → complete_registration_goals p_goal_type) works unchanged.
//   改善身形    → lose_weight
//   维持目前状态 → maintain_weight
const STEP2_DIRECTIONS: { value: GoalType; title: string; description: string }[] = [
  { value: "lose_weight", title: "改善身形", description: "希望慢慢改善体态，建立更健康、更有自信的自己。" },
  { value: "maintain_weight", title: "维持目前状态", description: "希望维持目前成果，养成更健康、更稳定的生活习惯。" },
];

function StepGoalType({ draft, update }: { draft: WizardDraft; update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void }) {
  // Single select: exactly one direction lives in goalTypes[0].
  const selected = draft.goalTypes[0] ?? null;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-900">Step 2：告诉我们，你最想完成什么？</h2>
      <p className="text-sm text-slate-500">选择最符合你现在目标的方向，剩下的，就交给我们陪你一步一步完成。</p>
      <div className="flex flex-col gap-3">
        {STEP2_DIRECTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => update("goalTypes", [option.value])}
              className={cn(
                "flex flex-col gap-1 rounded-2xl border p-4 text-left transition",
                isSelected ? "border-emerald-300 bg-emerald-50" : "border-slate-100 hover:border-slate-200",
              )}
            >
              <span className={cn("text-sm font-semibold", isSelected ? "text-emerald-700" : "text-slate-800")}>{option.title}</span>
              <p className="text-xs text-slate-500">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepJourneyPlan({ draft, update }: { draft: WizardDraft; update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-900">Step 4：你想陪自己走多久？</h2>
      <p className="text-sm text-slate-500">每一段 Journey 都有不同的收获。选择你想从哪里开始，我们会陪你一步一步走下去。</p>
      <div className="flex flex-col gap-3">
        {JOURNEY_PLAN_OPTIONS.map((option) => {
          // Two independent states: the badge is social proof (always on the
          // 60-day card); the emerald border/background is the customer's
          // active selection (moves as they choose).
          const selected = draft.journeyDays === option.days;
          return (
            <button
              key={option.days}
              type="button"
              onClick={() => update("journeyDays", option.days)}
              className={cn(
                "flex flex-col gap-1 rounded-2xl border p-4 text-left transition",
                selected ? "border-emerald-300 bg-emerald-50" : "border-slate-100 hover:border-slate-200",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn("text-sm font-semibold", selected ? "text-emerald-700" : "text-slate-800")}>{option.label}</span>
                {option.badge && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{option.badge}</span>
                )}
              </div>
              <p className={cn("text-sm font-medium", selected ? "text-emerald-800" : "text-slate-700")}>{option.title}</p>
              <p className="text-xs text-slate-500">{option.description}</p>
            </button>
          );
        })}
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
  goalStatus,
  weightGoalRange,
  finalTarget,
  draft,
  update,
  customWithinRange,
  journeyDays,
}: {
  currentWeight: number;
  canSuggestLoss: boolean;
  goalStatus: GoalStatus | null;
  weightGoalRange: WeightGoalRange | null;
  finalTarget: { min: number; max: number };
  draft: WizardDraft;
  update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
  customWithinRange: boolean | null;
  journeyDays: JourneyDays | 0;
}) {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const showWarning = customWithinRange === false && !warningDismissed;

  // Rendering rule (explicit, mutually exclusive). A safe first-stage loss
  // target shows whenever the loss gate passes AND a rule range exists — this
  // is true for BOTH auto_approved and auto_adjusted (canSuggestLoss already
  // encodes goalStatus !== 'goal_restricted' && goal === lose_weight). goalStatus
  // is NEVER checked for === 'auto_approved' here.
  const showLossCard = canSuggestLoss && weightGoalRange !== null;
  const showRuleMissing = canSuggestLoss && weightGoalRange === null; // loss-eligible but rule table not resolved yet
  const showMaintenance = !canSuggestLoss;

  if (!currentWeight || !journeyDays) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-slate-900">Step 5：这是属于你的第一阶段目标</h2>
        <p className="text-sm text-slate-400">请先完成前面几步</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-900">Step 5：这是属于你的第一阶段目标</h2>
      <p className="text-sm text-slate-500">根据你刚刚填写的资料，我们已经帮你规划好第一阶段。不用一次做到所有改变，我们会陪你一步一步完成。</p>

      {showLossCard && weightGoalRange && (
        <>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">目前体重</span>
              <span className="text-lg font-semibold text-slate-900">{currentWeight} kg</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">第一阶段目标</span>
              <span className="text-lg font-semibold text-slate-900">{formatRange(weightGoalRange.minTargetWeightKg, weightGoalRange.maxTargetWeightKg)} kg</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">计划减重</span>
              <span className="text-lg font-semibold text-emerald-700">{formatRange(weightGoalRange.minLossKg, weightGoalRange.maxLossKg)} kg</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Journey 时长</span>
              <span className="text-sm font-medium text-slate-700">{journeyDays} 天</span>
            </div>
            <p className="mt-3 text-xs text-slate-500">这一次，我们先从这里开始。不需要急着一次达到最终目标，我们会陪你一步一步完成。</p>
            <p className="mt-2 text-[11px] text-slate-400">这个目标属于健康且较容易坚持的减重速度。实际成果会受到饮食、睡眠、运动、执行率及个人体质影响。</p>
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
      )}

      {showRuleMissing && (
        <p className="text-sm text-slate-400">目前体重区间暂无建议规则，请联系客服。</p>
      )}

      {showMaintenance && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">目前体重</span>
            <span className="text-lg font-semibold text-slate-900">{currentWeight} kg</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-xs text-slate-500">第一阶段目标</span>
            <span className="text-right text-sm font-semibold text-emerald-700">维持现在的状态，慢慢养成好习惯</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {goalStatus === "goal_restricted"
              ? "考虑到你现在填写的资料，第一阶段我们先陪你把饮食、饮水和作息的基础打好，让身体处在更适合的状态，再一起规划下一步。"
              : "这个阶段我们先陪你专注在饮食、饮水和生活规律，把每天的好习惯慢慢稳定下来，为之后的改变打好基础。"}
          </p>
        </div>
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
      <h2 className="text-base font-semibold text-slate-900">Step 3：一起设定你的目标</h2>
      <p className="text-sm text-slate-500">这是你心中的长期目标。不用担心，我们会陪你一步一步慢慢靠近。</p>
      <FieldLabel>
        我的理想体重（kg）
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
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          🌱 这是一个很棒的目标。为了让你更容易坚持，我们会先陪你完成第一阶段的小目标，再一步一步靠近你的理想目标。
        </div>
      )}
    </div>
  );
}

function OnboardingResult({ result }: { result: CompleteRegistrationGoalsResult }) {
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

        {/* Plain <a>, NOT next/link: onboarding just flipped
            onboarding_completed_at server-side via a client RPC, so the App
            Router's prefetched/cached routing decision for /customer is stale.
            A soft <Link> navigation can resolve straight back to this page
            (the reported "开始 Journey does nothing"). A raw anchor forces a
            full document load so the proxy re-evaluates with fresh state. */}
        <a
          href="/customer"
          className="mt-6 block w-full rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          开始 Journey →
        </a>
      </div>
    </div>
  );
}
