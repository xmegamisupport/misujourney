"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { initializeInventoryFromRegistration } from "@/lib/inventory/engine";
import { parseNonNegativeInt } from "@/lib/inventory/validation";
import { lookupCoachByReferral, normalizeReferralCode, isReferralCodeShape, type ReferralCoach } from "@/lib/referral";

const PENDING_INVENTORY_KEY = "misu_pending_inventory_init";
/** Set the moment an account is created so onboarding knows this is a brand-new
 * sign-up (skip the "welcome back" resume screen). Scoped to the tab session:
 * it survives a mid-onboarding refresh but is gone when the customer closes the
 * tab and returns later — exactly when the resume screen SHOULD appear.
 * Must match the literal read in src/app/onboarding/page.tsx. */
const FRESH_SIGNUP_KEY = "misu_onboarding_fresh";

type Mode = "choose" | "customer";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const searchParams = useSearchParams();
  // A ?ref= link is a customer invitation — skip the picker and go straight to
  // the customer form so registration "simply continues". Coach access is no
  // longer self-serve; it is granted only by an Admin.
  const refParam = searchParams.get("ref");
  const [mode, setMode] = useState<Mode>(refParam ? "customer" : "choose");

  if (mode === "customer") return <CustomerRegisterForm refParam={refParam} onBack={() => setMode("choose")} />;
  return <RoleChoice onChoose={setMode} />;
}

function RoleChoice({ onChoose }: { onChoose: (mode: Mode) => void }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🌱</span>
          <h1 className="text-xl font-semibold text-slate-900">欢迎来到 MISU Journey</h1>
          <p className="text-sm text-emerald-600">Every Day Is A New Journey</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold leading-relaxed text-slate-900">
            谢谢你选择相信 MISU ❤️
            <br />
            很开心，能够陪你一起开启这段 Journey。
          </h2>
          <div className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-slate-600">
            <p>MISU Journey，不只是记录每一天。</p>
            <p>它会陪伴你更了解自己的身体、看见每一点改变，一步一步养成更健康的生活方式。</p>
            <p>接下来的 Journey，我们一起慢慢完成。</p>
          </div>

          <button
            type="button"
            onClick={() => onChoose("customer")}
            className="mt-6 w-full rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            开启我的 MISU Journey
          </button>
          <p className="mt-3 text-center text-sm text-emerald-600">我们会陪着你，一步一步开始。</p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          已经有账号了？{" "}
          <Link href="/login" className="font-medium text-emerald-600">
            回到登入首页
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Small green confirmation of the identified Coach — reused for both the
 * referral link and the manual fallback. Not a landing page, just one line. */
function CoachBadge({ coach }: { coach: ReferralCoach }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg">{coach.avatar ?? "🌿"}</span>
      <p className="text-sm text-slate-700">
        你的专属 Coach：<span className="font-semibold text-emerald-700">{coach.name}</span>
      </p>
    </div>
  );
}

type RefStatus = "loading" | "valid" | "invalid";

function CustomerRegisterForm({ refParam, onBack }: { refParam: string | null; onBack: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [boxesN, setBoxesN] = useState("0");
  const [boxesDX, setBoxesDX] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);

  // Referral link mode: validate the ?ref= code before allowing sign-up.
  const linkMode = refParam !== null;
  const [refStatus, setRefStatus] = useState<RefStatus>(linkMode ? "loading" : "valid");
  const [refCoach, setRefCoach] = useState<ReferralCoach | null>(null);

  // Manual fallback (normal registration only). manualStatus is derived from
  // the typed code + the last async lookup result, so the effect only ever
  // sets state inside the debounced callback (no synchronous setState).
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualChecked, setManualChecked] = useState<string | null>(null);
  const [manualCoach, setManualCoach] = useState<ReferralCoach | null>(null);

  const parsedN = parseNonNegativeInt(boxesN);
  const parsedDX = parseNonNegativeInt(boxesDX);

  const manualTrimmed = manualCode.trim();
  const manualShapeOk = isReferralCodeShape(manualTrimmed);
  const manualStatus: "idle" | "loading" | "valid" | "invalid" =
    !showManual || manualTrimmed === ""
      ? "idle"
      : !manualShapeOk
        ? "invalid"
        : manualTrimmed !== manualChecked
          ? "loading"
          : manualCoach
            ? "valid"
            : "invalid";

  // Validate the referral link once on entry — state set only in the async
  // result; refStatus starts as "loading" for link mode.
  useEffect(() => {
    if (!linkMode || refParam === null) return;
    let cancelled = false;
    lookupCoachByReferral(refParam).then((coach) => {
      if (cancelled) return;
      if (coach) {
        setRefCoach(coach);
        setRefStatus("valid");
      } else {
        setRefStatus("invalid");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [linkMode, refParam]);

  // Debounced validation for the manual fallback code.
  useEffect(() => {
    if (linkMode || !showManual || !manualShapeOk || manualTrimmed === manualChecked) return;
    const handle = setTimeout(() => {
      lookupCoachByReferral(manualTrimmed).then((coach) => {
        setManualCoach(coach);
        setManualChecked(manualTrimmed);
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [linkMode, showManual, manualShapeOk, manualTrimmed, manualChecked]);

  /** The validated code to persist in user_metadata at sign-up — carried
   * through email confirmation into onboarding, where complete_registration_
   * goals() does the trusted binding. Only ever a code string; never a id. */
  function referralToStore(): string | undefined {
    if (linkMode) return refStatus === "valid" ? normalizeReferralCode(refParam ?? "") : undefined;
    return manualStatus === "valid" ? normalizeReferralCode(manualCode) : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("请输入姓名");
      return;
    }
    if (!phone.trim()) {
      setError("请输入电话号码");
      return;
    }
    if (!email.trim() || !password) {
      setError("请输入邮箱和密码");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 位");
      return;
    }
    if (parsedN === null || parsedDX === null) {
      setError("购买盒数只能填写 0 或正整数");
      return;
    }
    if (parsedN <= 0 && parsedDX <= 0) {
      setError("至少一项产品的购买盒数必须大于 0");
      return;
    }

    const referralCode = referralToStore();

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim(), phone: phone.trim(), ...(referralCode ? { referral_code: referralCode } : {}) } },
    });

    if (signUpError) {
      setSubmitting(false);
      if (signUpError.message === "User already registered") {
        // Creating an auth account isn't the same as finishing registration.
        // A returning customer who left mid-onboarding lands here — don't treat
        // it as an error or ask for another email; welcome them back and send
        // them to login, which resumes onboarding right where they left off.
        setExistingAccount(true);
      } else {
        console.error("Sign up failed:", signUpError);
        setError("注册失败，请稍后再试或联系客服");
      }
      return;
    }

    if (data.session) {
      const result = await initializeInventoryFromRegistration(data.session.user.id, {
        MISU_N_PLUS: parsedN,
        MISU_DX_PLUS: parsedDX,
      });
      setSubmitting(false);
      if (!result.ok) {
        setError(`账号已创建，但初始库存设置失败：${result.error}`);
        return;
      }
      window.sessionStorage.setItem(FRESH_SIGNUP_KEY, "1");
      router.push("/customer");
      router.refresh();
      return;
    }

    // Email confirmation required — no session yet. Stash the inventory
    // numbers so the first successful login can complete the setup. The
    // referral code rides along in user_metadata, so it survives confirmation.
    window.localStorage.setItem(PENDING_INVENTORY_KEY, JSON.stringify({ boxesN: parsedN, boxesDX: parsedDX }));
    window.sessionStorage.setItem(FRESH_SIGNUP_KEY, "1");
    setSubmitting(false);
    setPendingConfirmation(true);
  }

  if (existingAccount) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
        <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl mx-auto mb-3">👋</span>
          <p className="mb-2 text-base font-semibold text-slate-900">欢迎回来</p>
          <p className="mb-5 text-sm text-slate-500">看起来你之前已经用这个邮箱创建了账号。直接登录就能继续完成你的资料填写。</p>
          <Link href="/login" className="block w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
            前往登录继续
          </Link>
        </div>
      </div>
    );
  }

  if (pendingConfirmation) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
        <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl mx-auto mb-3">✉️</span>
          <p className="mb-2 text-base font-semibold text-slate-900">请查收确认邮件</p>
          <p className="mb-5 text-sm text-slate-500">我们已发送确认链接到 {email}，确认后即可登录并开始旅程。</p>
          <Link href="/login" className="block w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  // Invalid referral link — do NOT let it silently create an unbound customer.
  if (linkMode && refStatus === "invalid") {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
        <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl">⚠️</span>
          <p className="mb-2 text-base font-semibold text-slate-900">推荐链接无法识别</p>
          <p className="mb-5 text-sm text-slate-500">这个推荐链接暂时无法识别，请向你的 Coach 获取正确链接。</p>
          <Link
            href="/register"
            className="block w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            继续普通注册
          </Link>
        </div>
      </div>
    );
  }

  const submitDisabled = submitting || (linkMode && refStatus !== "valid");

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🌱</span>
          <h1 className="text-xl font-semibold text-slate-900">加入 MISU Journey</h1>
          <p className="text-sm text-emerald-600">Every Day Is A New Journey</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <button type="button" onClick={onBack} className="mb-4 text-sm font-medium text-slate-400 transition hover:text-slate-600">
            ← 返回
          </button>
          <h2 className="mb-5 text-lg font-semibold text-slate-900">创建账号</h2>

          {/* Referral link: locked Coach confirmation, no editable field. */}
          {linkMode && refStatus === "loading" && (
            <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-400">识别推荐链接中…</div>
          )}
          {linkMode && refStatus === "valid" && refCoach && (
            <div className="mb-5">
              <CoachBadge coach={refCoach} />
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              姓名
              <input
                type="text"
                placeholder="你的名字"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              电话号码
              <input
                type="tel"
                inputMode="tel"
                placeholder="+60 1x-xxx xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              邮箱
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-600">
              密码
              <input
                type="password"
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            {/* Manual referral fallback — only in normal registration (no link). */}
            {!linkMode && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                {!showManual ? (
                  <button type="button" onClick={() => setShowManual(true)} className="text-sm font-medium text-emerald-600">
                    有推荐码？
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1.5 text-sm text-slate-600">
                      推荐码（Coach 的 Reseller Username）
                      <input
                        type="text"
                        placeholder="例如 chloe688"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                    {manualStatus === "loading" && <p className="text-xs text-slate-400">识别中…</p>}
                    {manualStatus === "valid" && manualCoach && <CoachBadge coach={manualCoach} />}
                    {manualStatus === "invalid" && (
                      <p className="text-xs text-amber-600">找不到这位 Coach，请确认推荐码；你也可以先不填，稍后由管理员为你安排。</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="mb-1 text-sm font-semibold text-slate-800">我的 MISU 产品</p>
              <p className="mb-3 text-xs text-slate-500">请填写你目前购买的产品数量。</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-slate-600">
                  MISU N+ 代餐（盒）
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={boxesN}
                    onChange={(e) => setBoxesN(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-slate-600">
                  MISU DX+ 排毒（盒）
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={boxesDX}
                    onChange={(e) => setBoxesDX(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-base outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>
            </div>

            {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

            <button
              type="submit"
              disabled={submitDisabled}
              className="mt-1 rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {submitting ? "注册中..." : "注册并开始旅程"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            已经有账号？{" "}
            <Link href="/login" className="font-medium text-emerald-600">
              直接登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
