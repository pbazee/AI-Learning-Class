"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  buildAuthCallbackUrl,
  DEFAULT_AFTER_AUTH,
  sanitizeAuthRedirectPath,
} from "@/lib/auth-redirect";
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
import { logger } from "@/lib/logger";
import { onboardingQuizQuestions as quizQuestions } from "@/lib/onboarding";
import { DEFAULT_SITE_NAME } from "@/lib/site";
import { getSupabaseClient } from "@/lib/supabase";
import type { Course } from "@/types";

type SignupStep = "account" | "quiz" | "roadmap";

const stepConfig: Array<{ id: SignupStep; label: string }> = [
  { id: "account", label: "Account" },
  { id: "quiz", label: "Quiz" },
  { id: "roadmap", label: "Learning Path" },
];

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M21.6 12.23c0-.76-.07-1.49-.2-2.2H12v4.16h5.38a4.6 4.6 0 0 1-1.99 3.02v2.5h3.22c1.89-1.74 2.99-4.31 2.99-7.48Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.22-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A9.98 9.98 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.91A5.98 5.98 0 0 1 6.09 12c0-.66.11-1.31.31-1.91V7.5H3.07a9.98 9.98 0 0 0 0 9l3.33-2.59Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.97c1.47 0 2.78.5 3.81 1.48l2.86-2.86C16.95 2.98 14.69 2 12 2a9.98 9.98 0 0 0-8.93 5.5l3.33 2.59c.79-2.36 3-4.12 5.6-4.12Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const redirectPath = sanitizeAuthRedirectPath(searchParams.get("redirect"));
  const requestedStep = searchParams.get("step");
  const [step, setStep] = useState<SignupStep>(requestedStep === "quiz" ? "quiz" : "account");
  const [showPassword, setShowPassword] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmSent, setEmailConfirmSent] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [branding, setBranding] = useState({
    siteName: DEFAULT_SITE_NAME,
    logoUrl: "",
  });

  const currentQuizQuestion = quizQuestions[quizStep];
  const currentStepIndex = stepConfig.findIndex((entry) => entry.id === step);
  const roadmapCourses = useMemo(
    () => recommendedCourses.slice(0, 4),
    [recommendedCourses]
  );

  useEffect(() => {
    let mounted = true;

    async function loadBranding() {
      try {
        const response = await fetch("/api/settings?keys=siteName,logoUrl", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!mounted || !response.ok || !payload) {
          return;
        }

        setBranding({
          siteName: payload.siteName?.trim() || DEFAULT_SITE_NAME,
          logoUrl: payload.logoUrl || "",
        });
      } catch {
        // The default logo fallback is good enough if settings fail to load.
      }
    }

    void loadBranding();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadOnboardingState() {
      try {
        const response = await fetch("/api/account/onboarding", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json().catch(() => null);

        if (!mounted || !payload) {
          return;
        }

        const savedAnswers =
          payload.answers && typeof payload.answers === "object" ? payload.answers : {};
        const savedRecommendations = Array.isArray(payload.recommendations)
          ? payload.recommendations
          : [];

        setAnswers(savedAnswers);
        setRecommendedCourses(savedRecommendations);

        if (payload.completed) {
          router.replace(redirectPath === DEFAULT_AFTER_AUTH ? "/dashboard" : redirectPath);
          return;
        }

        if (savedRecommendations.length > 0) {
          setStep("roadmap");
          setQuizStep(quizQuestions.length - 1);
          return;
        }

        if (requestedStep === "quiz" || Object.keys(savedAnswers).length > 0) {
          setStep("quiz");
          const nextQuizIndex = quizQuestions.findIndex(
            (question) => typeof savedAnswers[question.id] !== "number"
          );
          setQuizStep(nextQuizIndex === -1 ? quizQuestions.length - 1 : nextQuizIndex);
        }
      } catch {
        // If onboarding state fails to load we keep the local flow usable.
      }
    }

    void loadOnboardingState();

    return () => {
      mounted = false;
    };
  }, [redirectPath, requestedStep, router]);

  async function syncNewsletterPreference(nextEmail: string, nextName?: string) {
    if (!newsletterOptIn || !nextEmail.trim()) {
      return;
    }

    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, name: nextName }),
      });
    } catch {
      // Newsletter opt-in should never block sign-up.
    }
  }

  async function handleGoogleSignUp() {
    setError(null);
    setLoading(true);
    const supabase = getSupabaseClient();
    await syncNewsletterPreference(email, name);
    logger.debug(
      "[signup] Starting Google OAuth, redirectTo:",
      buildAuthCallbackUrl("/signup?step=quiz")
    );

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: buildAuthCallbackUrl("/signup?step=quiz") },
    });

    if (oauthError) {
      console.error("[signup] Google OAuth error:", oauthError.message);
      setError(oauthError.message);
      setLoading(false);
    }
  }

  async function handleAccountSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    logger.info("[signup] Creating account for:", email);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: buildAuthCallbackUrl("/signup?step=quiz"),
      },
    });

    if (signUpError) {
      console.error("[signup] signUp error:", signUpError.message);
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    logger.debug("[signup] signUp response - user:", {
      userId: data.user?.id,
      hasSession: !!data.session,
    });

    if (data.user && !data.session) {
      void syncNewsletterPreference(email, name);
      logger.info("[signup] Email confirmation required, check inbox");
      setEmailConfirmSent(true);
      setLoading(false);
      return;
    }

    logger.info("[signup] Account created and auto-confirmed");
    if (referralCode) {
      fetch("/api/referrals/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode }),
      }).catch(() => {});
    }
    void syncNewsletterPreference(email, name);
    setLoading(false);

    if (redirectPath !== DEFAULT_AFTER_AUTH) {
      router.push(redirectPath);
      router.refresh();
      return;
    }

    setStep("quiz");
  }

  function handleAnswer(questionId: string, answerIdx: number) {
    const nextAnswers = { ...answers, [questionId]: answerIdx };
    setAnswers(nextAnswers);
    setError(null);

    if (quizStep < quizQuestions.length - 1) {
      window.setTimeout(() => setQuizStep((previous) => previous + 1), 300);
      return;
    }

    setOnboardingLoading(true);
    window.setTimeout(async () => {
      try {
        const response = await fetch("/api/account/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: nextAnswers }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to build your learning path.");
        }

        setRecommendedCourses(Array.isArray(payload?.recommendations) ? payload.recommendations : []);
        setStep("roadmap");
      } catch (quizError) {
        setError(
          quizError instanceof Error
            ? quizError.message
            : "Unable to build your learning path right now."
        );
      } finally {
        setOnboardingLoading(false);
      }
    }, 350);
  }

  async function completeOnboarding(destination: string) {
    setOnboardingLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/account/onboarding", {
        method: "PATCH",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to finish onboarding.");
      }

      router.push(destination);
      router.refresh();
    } catch (completionError) {
      setError(
        completionError instanceof Error
          ? completionError.message
          : "Unable to finish onboarding right now."
      );
    } finally {
      setOnboardingLoading(false);
    }
  }

  return (
    <AuthShell
      badge="Create Your Account"
      siteName={branding.siteName}
      logoUrl={branding.logoUrl || undefined}
      title="Join the next generation of AI builders"
      subtitle="Open a polished workspace for courses, guided onboarding, and the production-focused paths your team can actually use."
    >
      <div className="w-full">
        <div className="mb-8">
          <div className="flex items-start gap-2">
            {stepConfig.map((entry, index) => {
              const isComplete = currentStepIndex > index;
              const isActive = step === entry.id;

              return (
                <div key={entry.id} className="flex flex-1 items-start gap-2">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition-all ${
                        isComplete
                          ? "border-sky-400 bg-sky-500 text-white"
                          : isActive
                            ? "border-sky-400 bg-primary-blue text-white shadow-[0_0_0_6px_rgba(56,189,248,0.16)]"
                            : "border-white/30 bg-transparent text-white/80"
                      }`}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                      {entry.label}
                    </span>
                  </div>
                  {index < stepConfig.length - 1 ? (
                    <div
                      className={`mt-5 h-0.5 flex-1 transition-all ${
                        isComplete ? "bg-sky-500" : "bg-white/20"
                      }`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "account" ? (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6 text-center">
                <h1 className="mb-1 text-2xl font-black text-white">Start learning with a premium setup</h1>
                <p className="text-sm text-slate-200">
                  Create your account, then personalize your roadmap in under a minute.
                </p>
              </div>

              {emailConfirmSent ? (
                <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_20px_50px_-38px_rgba(15,23,42,0.22)]">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
                    <Mail className="h-8 w-8 text-sky-700" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-slate-950">Confirm your email</h3>
                  <p className="mb-4 text-sm text-slate-800">
                    We sent a confirmation link to <strong className="text-slate-950">{email}</strong>. Click it to activate your account and start learning.
                  </p>
                  <button
                    type="button"
                    onClick={() => setEmailConfirmSent(false)}
                    className="text-xs font-semibold text-slate-950 transition hover:text-sky-700"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.22)] sm:p-7">
                  {error ? (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    disabled={loading}
                    className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 py-3.5 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950" />
                    ) : (
                      <GoogleIcon className="h-5 w-5" />
                    )}
                    Continue with Google
                  </button>

                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-400">or</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <form onSubmit={handleAccountSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                        Full name
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          required
                          placeholder="Your name"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 placeholder:text-slate-600 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          placeholder="you@example.com"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 placeholder:text-slate-600 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          placeholder="Min 8 characters"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-slate-950 placeholder:text-slate-600 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-900"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={newsletterOptIn}
                        onChange={(event) => setNewsletterOptIn(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-blue focus:ring-primary-blue"
                      />
                      <span className="text-xs leading-5 text-slate-800">
                        Get notified on more offers, discounts, and new AI trends.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {loading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs text-slate-800">
                      By signing up you agree to our{" "}
                      <Link href="/terms" className="font-semibold text-slate-950 transition hover:text-sky-700">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="font-semibold text-slate-950 transition hover:text-sky-700">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </form>
                </div>
              )}

              <p className="mt-6 text-center text-sm text-slate-100">
                Already have an account?{" "}
                <Link
                  href={
                    redirectPath !== DEFAULT_AFTER_AUTH
                      ? `/login?redirect=${encodeURIComponent(redirectPath)}`
                      : "/login"
                  }
                  className="font-semibold text-white transition hover:text-sky-300"
                >
                  Sign in
                </Link>
              </p>
            </motion.div>
          ) : null}

          {step === "quiz" ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6 text-center">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2">
                  <Sparkles className="h-4 w-4 text-sky-700" />
                  <span className="text-sm font-medium text-sky-700">60-second AI quiz</span>
                </div>
                <h2 className="mb-1 text-xl font-black text-white">Personalize your roadmap</h2>
                <p className="text-sm text-slate-200">4 quick questions to build your perfect learning path.</p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.22)]">
                <div className="mb-6 flex gap-1.5">
                  {quizQuestions.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        index <= quizStep ? "bg-sky-600" : "bg-slate-100"
                      }`}
                    />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={quizStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {error ? (
                      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    ) : null}
                    <p className="mb-1 text-sm text-slate-700">
                      Question {quizStep + 1} of {quizQuestions.length}
                    </p>
                    <h3 className="mb-6 text-lg font-bold text-slate-950">
                      {currentQuizQuestion.question}
                    </h3>
                    <div className="space-y-3">
                      {currentQuizQuestion.options.map((option, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleAnswer(currentQuizQuestion.id, index)}
                          disabled={onboardingLoading}
                          className={`w-full rounded-xl border px-5 py-4 text-left text-sm transition-all ${
                            answers[currentQuizQuestion.id] === index
                              ? "border-sky-300 bg-sky-50 text-slate-950"
                              : "border-slate-200 bg-slate-50 text-slate-950 hover:border-sky-200 hover:bg-white"
                          }`}
                        >
                          <span className="mr-3 font-semibold text-sky-700">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          {option}
                        </button>
                      ))}
                    </div>
                    {onboardingLoading ? (
                      <p className="mt-5 text-sm font-medium text-slate-600">
                        Building your recommended learning path...
                      </p>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}

          {step === "roadmap" ? (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-sky-200 bg-sky-100">
                  <Sparkles className="h-8 w-8 text-sky-700" />
                </div>
                <h2 className="mb-1 text-xl font-black text-white">Your AI roadmap is ready</h2>
                <p className="text-sm text-slate-200">
                  Based on your answers, here&apos;s your personalized learning path.
                </p>
              </div>

              {error ? (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="mb-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.22)]">
                <div className="mb-5">
                  <h3 className="text-lg font-black text-slate-950">Your Learning Path</h3>
                  <p className="text-sm text-slate-700">
                    Start with the courses that best fit your experience, goals, and interests.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {roadmapCourses.map((course) => (
                    <div
                      key={course.id}
                      className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50"
                    >
                      <div className="relative aspect-[16/10] bg-slate-200">
                        <Image
                          src={course.imageUrl || course.thumbnailUrl || "/trusted-logos/openai.svg"}
                          alt={course.title}
                          fill
                          quality={75}
                          placeholder="blur"
                          blurDataURL={IMAGE_BLUR_DATA_URL}
                          sizes="(min-width: 640px) 30vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                            {course.level.replace("_", " ")}
                          </span>
                          <span className="text-xs font-medium text-slate-500">{course.categoryName}</span>
                        </div>
                        <div>
                          <p className="line-clamp-2 text-base font-bold text-slate-950">{course.title}</p>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                            {course.shortDescription || course.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void completeOnboarding(`/courses/${course.slug}`)}
                          disabled={onboardingLoading}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-blue px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-blue/90 disabled:opacity-70"
                        >
                          Start Learning
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void completeOnboarding("/dashboard")}
                disabled={onboardingLoading}
                className="block w-full rounded-2xl bg-slate-950 py-4 text-center text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-70"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecommendedCourses([]);
                  setStep("quiz");
                  setQuizStep(0);
                  setError(null);
                }}
                className="mt-3 block w-full text-center text-sm text-slate-200 transition hover:text-white"
              >
                Retake quiz
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </AuthShell>
  );
}
