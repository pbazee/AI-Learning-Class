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
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding-storage";
import { getSupabaseClient } from "@/lib/supabase";
import type { Category, Course, OnboardingQuizAnswers } from "@/types";

type SignupStep = "account" | "quiz" | "roadmap";
type StoredOnboardingState = {
  answers: Partial<OnboardingQuizAnswers>;
  quizStep: number;
  step: SignupStep;
  recommendedCourses: Course[];
};

const defaultCategories: Category[] = [
  { id: "prompt", name: "Prompt Engineering & LLMs", slug: "prompt" },
  { id: "ml", name: "Machine Learning & Deep Learning", slug: "ml" },
  { id: "tools", name: "AI Tools for Content & Marketing", slug: "tools" },
  { id: "agents", name: "Building AI Agents & Automations", slug: "agents" },
];

const stepConfig: Array<{ id: SignupStep; label: string }> = [
  { id: "account", label: "Account" },
  { id: "quiz", label: "Quiz" },
  { id: "roadmap", label: "Learning Path" },
];

type AuthBranding = {
  siteName: string;
  logoUrl?: string;
};

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

export function SignupPageClient({
  initialBranding,
}: {
  initialBranding: AuthBranding;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const redirectPath = sanitizeAuthRedirectPath(searchParams.get("redirect"));
  const requestedStep = searchParams.get("step");
  const [step, setStep] = useState<SignupStep>(requestedStep === "quiz" ? "quiz" : "account");
  const [showPassword, setShowPassword] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingQuizAnswers>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmSent, setEmailConfirmSent] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);

  const currentQuizQuestion = quizQuestions[quizStep];
  const currentStepIndex = stepConfig.findIndex((entry) => entry.id === step);
  const displayCategories = categories.length > 0 ? categories : defaultCategories;
  const roadmapCourses = useMemo(
    () => recommendedCourses.slice(0, 3),
    [recommendedCourses]
  );
  const currentAnswer = answers[currentQuizQuestion.id as keyof OnboardingQuizAnswers];
  const currentOtherField =
    currentQuizQuestion.id === "experience"
      ? "experience_other"
      : currentQuizQuestion.id === "goal"
        ? "goal_other"
        : currentQuizQuestion.id === "time"
          ? "time_other"
          : "category_other";
  const currentOtherValue =
    typeof answers[currentOtherField as keyof OnboardingQuizAnswers] === "string"
      ? String(answers[currentOtherField as keyof OnboardingQuizAnswers] ?? "")
      : "";

  useEffect(() => {
    let mounted = true;

    async function fetchCategories() {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from("categories")
          .select("id, name, slug")
          .order("name")
          .limit(6);

        if (mounted) {
          setCategories(Array.isArray(data) ? (data as Category[]) : []);
        }
      } catch {
        if (mounted) {
          setCategories([]);
        }
      } finally {
        if (mounted) {
          setCategoriesLoading(false);
        }
      }
    }

    void fetchCategories();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadOnboardingState() {
      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!mounted) {
          return;
        }

        setStep("account");
        setQuizStep(0);
        setAnswers({});
        setRecommendedCourses([]);
        setAuthResolved(true);
        return;
      }

      if (typeof user.user_metadata?.onboarding_completed_at === "string") {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        }
        router.replace("/dashboard");
        return;
      }

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

        if (typeof window !== "undefined") {
          try {
            const savedState = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
            if (savedState) {
              const parsed = JSON.parse(savedState) as Partial<StoredOnboardingState>;

              if (parsed.answers && typeof parsed.answers === "object") {
                setAnswers(parsed.answers as Partial<OnboardingQuizAnswers>);
              }

              if (typeof parsed.quizStep === "number" && parsed.quizStep >= 0) {
                setQuizStep(Math.min(parsed.quizStep, quizQuestions.length - 1));
              }

              if (parsed.step && ["account", "quiz", "roadmap"].includes(parsed.step)) {
                setStep(parsed.step as SignupStep);
              }

              if (Array.isArray(parsed.recommendedCourses)) {
                setRecommendedCourses(parsed.recommendedCourses as Course[]);
              }
            }
          } catch {
            // Ignore invalid cached onboarding state.
          }
        }

        const savedAnswers =
          payload.answers && typeof payload.answers === "object" ? payload.answers : {};
        const savedRecommendations = Array.isArray(payload.recommendations)
          ? payload.recommendations
          : [];
        const savedCategories = Array.isArray(payload.categories) ? payload.categories : [];

        setAnswers(savedAnswers as Partial<OnboardingQuizAnswers>);
        if (savedCategories.length > 0) {
          setCategories(savedCategories as Category[]);
        }
        setRecommendedCourses(savedRecommendations);

        if (payload.completed) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
          }
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
            (question) => typeof savedAnswers[question.id] !== "string"
          );
          setQuizStep(nextQuizIndex === -1 ? quizQuestions.length - 1 : nextQuizIndex);
          return;
        }

        setStep("quiz");
      } catch {
        // If onboarding state fails to load we keep the local flow usable.
      } finally {
        if (mounted) {
          setAuthResolved(true);
        }
      }
    }

    void loadOnboardingState();

    return () => {
      mounted = false;
    };
  }, [redirectPath, requestedStep, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextState: StoredOnboardingState = {
      answers,
      quizStep,
      step,
      recommendedCourses,
    };

    if (step !== "account" || Object.keys(answers).length > 0 || recommendedCourses.length > 0) {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(nextState));
    }
  }, [answers, quizStep, recommendedCourses, step]);

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

    setStep("quiz");
    setQuizStep(0);
  }

  function handleAnswer(
    questionId: keyof OnboardingQuizAnswers,
    value: string,
    options?: { advanceOnOther?: boolean }
  ) {
    const nextAnswers = { ...answers, [questionId]: value };

    if (value !== "other") {
      if (questionId === "experience") nextAnswers.experience_other = "";
      if (questionId === "goal") nextAnswers.goal_other = "";
      if (questionId === "time") nextAnswers.time_other = "";
      if (questionId === "category_id") nextAnswers.category_other = "";
    }

    setAnswers(nextAnswers);
    setError(null);

    if (value === "other" && !options?.advanceOnOther) {
      return;
    }

    if (quizStep < quizQuestions.length - 1) {
      window.setTimeout(() => setQuizStep((previous) => previous + 1), 400);
      return;
    }

    setOnboardingLoading(true);
    window.setTimeout(async () => {
      let nextRecommendations: Course[] = [];

      try {
        const response = await fetch("/api/account/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: nextAnswers }),
        });
        const payload = await response.json().catch(() => null);

        if (response.ok) {
          nextRecommendations = Array.isArray(payload?.recommendations) ? payload.recommendations : [];
        }
      } catch (quizError) {
        console.error("Quiz save failed silently:", quizError);
      } finally {
        setRecommendedCourses(nextRecommendations);
        setStep("roadmap");
        setOnboardingLoading(false);
      }
    }, 1500);
  }

  function handleOtherAnswerChange(field: keyof OnboardingQuizAnswers, value: string) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function submitOtherAnswer() {
    if (!currentOtherValue.trim()) {
      setError("Please add a short note so we can personalize your path.");
      return;
    }

    handleAnswer(currentQuizQuestion.id as keyof OnboardingQuizAnswers, "other", {
      advanceOnOther: true,
    });
  }

  async function completeOnboarding(
    destination: string,
    options?: { recommendationIds?: string[]; skipPersonalization?: boolean }
  ) {
    setOnboardingLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/account/onboarding", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recommendationIds: options?.skipPersonalization ? [] : options?.recommendationIds ?? recommendedCourses.map((course) => course.id),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "We couldn't finish saving your onboarding just yet."
        );
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }

      router.push(destination);
      router.refresh();
    } catch (completionError) {
      console.error("Onboarding completion save failed:", completionError);
      setError(
        completionError instanceof Error
          ? completionError.message
          : "We couldn't finish saving your onboarding just yet."
      );
      return;
    } finally {
      setOnboardingLoading(false);
    }
  }

  async function skipPersonalization() {
    await completeOnboarding("/dashboard", { recommendationIds: [], skipPersonalization: true });
  }

  async function handleRedoQuiz() {
    setOnboardingLoading(true);
    setError(null);

    try {
      await fetch("/api/account/onboarding", {
        method: "DELETE",
      });
    } catch (redoError) {
      console.error("Unable to reset onboarding before restarting the quiz:", redoError);
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }

      setRecommendedCourses([]);
      setAnswers({});
      setQuizStep(0);
      setStep("account");
      setOnboardingLoading(false);
    }
  }

  if (!authResolved) {
    return (
      <AuthShell
        badge="Create Your Account"
        siteName={initialBranding.siteName}
        logoUrl={initialBranding.logoUrl}
        title="Join the next generation of AI builders"
        subtitle="Open a polished workspace for courses, guided onboarding, and the production-focused paths your team can actually use."
      >
        <div className="right-panel w-full rounded-[32px] border border-white/30 bg-primary-blue p-6 text-white shadow-[0_34px_100px_-44px_rgba(37,99,235,0.55)] sm:p-8" />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      badge="Create Your Account"
      siteName={initialBranding.siteName}
      logoUrl={initialBranding.logoUrl}
      title="Join the next generation of AI builders"
      subtitle="Open a polished workspace for courses, guided onboarding, and the production-focused paths your team can actually use."
    >
      <div className="right-panel w-full rounded-[32px] border border-white/30 bg-primary-blue p-6 text-white shadow-[0_34px_100px_-44px_rgba(37,99,235,0.55)] sm:p-8">
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
                          ? "border-white bg-white text-primary-blue"
                          : isActive
                            ? "border-white bg-white text-primary-blue shadow-[0_0_0_6px_rgba(255,255,255,0.18)]"
                            : "border-white/75 bg-white text-primary-blue"
                      }`}
                    >
                      {isComplete ? <Check className="h-4 w-4 text-primary-blue" /> : index + 1}
                    </div>
                    <span className="step-label text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                      {entry.label}
                    </span>
                  </div>
                  {index < stepConfig.length - 1 ? (
                    <div
                      className={`mt-5 h-0.5 flex-1 transition-all ${
                        isComplete ? "bg-white/85" : "bg-white/35"
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
                <p className="text-sm text-white/80">
                  Create your account, then personalize your roadmap in under a minute.
                </p>
              </div>

              {emailConfirmSent ? (
                <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_20px_50px_-38px_rgba(15,23,42,0.22)]">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
                    <Mail className="h-8 w-8 text-sky-700" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900">Confirm your email</h3>
                  <p className="mb-4 text-sm text-slate-600">
                    We sent a confirmation link to <strong className="text-slate-900">{email}</strong>. Click it to activate your account and start learning.
                  </p>
                  <button
                    type="button"
                    onClick={() => setEmailConfirmSent(false)}
                    className="text-xs font-semibold text-primary-blue transition hover:text-primary-blue/80"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <div className="rounded-[28px] border border-white/20 bg-primary-blue p-6 sm:p-7">
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
                    className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white py-3.5 text-sm font-medium text-primary-blue transition hover:bg-white/90 disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <GoogleIcon className="h-5 w-5" />
                    )}
                    Continue with Google
                  </button>

                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/40" />
                    <span className="text-xs uppercase tracking-[0.16em] text-white/50">or</span>
                    <div className="h-px flex-1 bg-white/40" />
                  </div>

                  <form onSubmit={handleAccountSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-white">
                        Full name
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          required
                          placeholder="Your name"
                          className="h-12 w-full rounded-2xl border border-white/40 bg-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/70 outline-none transition focus:border-white focus:bg-white/15 focus:ring-4 focus:ring-white/15"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-white">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          placeholder="you@example.com"
                          className="h-12 w-full rounded-2xl border border-white/40 bg-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/70 outline-none transition focus:border-white focus:bg-white/15 focus:ring-4 focus:ring-white/15"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-white">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          placeholder="Min 8 characters"
                          className="h-12 w-full rounded-2xl border border-white/40 bg-white/10 pl-11 pr-11 text-sm text-white placeholder:text-white/70 outline-none transition focus:border-white focus:bg-white/15 focus:ring-4 focus:ring-white/15"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/55 transition hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-white/30 bg-white/10 px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={newsletterOptIn}
                        onChange={(event) => setNewsletterOptIn(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-blue focus:ring-primary-blue"
                      />
                      <span className="text-xs leading-5 text-white">
                        Get notified on more offers, discounts, and new AI trends.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-primary-blue transition hover:bg-white/90 disabled:opacity-60"
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

                    <p className="text-center text-xs text-white/75">
                      By signing up you agree to our{" "}
                      <Link href="/terms" className="font-semibold text-white transition hover:text-sky-300">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="font-semibold text-white transition hover:text-sky-300">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </form>
                </div>
              )}

              <p className="mt-6 text-center text-base text-white">
                Already have an account?{" "}
                <Link
                  href={
                    redirectPath !== DEFAULT_AFTER_AUTH
                      ? `/login?redirect=${encodeURIComponent(redirectPath)}`
                      : "/login"
                  }
                  className="font-bold text-white underline underline-offset-4 transition hover:text-white/85"
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
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2">
                  <Sparkles className="h-4 w-4 text-sky-200" />
                  <span className="text-sm font-medium text-sky-100">Personalization quiz</span>
                </div>
                <h2 className="mb-1 text-xl font-black text-white">Personalize your roadmap</h2>
                <p className="text-sm text-white/85">4 quick questions to build your perfect learning path.</p>
              </div>

              <div className="rounded-[28px] border border-white/20 bg-primary-blue p-8">
                <div className="mb-6 flex gap-1.5">
                  {quizQuestions.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        index <= quizStep ? "bg-white" : "bg-white/35"
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
                    <p className="helper-text mb-1 text-sm text-white/65">
                      Question {quizStep + 1} of {quizQuestions.length}
                    </p>
                    <h3 className="quiz-question mb-6 text-2xl font-semibold text-white">
                      {currentQuizQuestion.question}
                    </h3>
                    {onboardingLoading ? (
                      <div className="flex min-h-[16rem] flex-col items-center justify-center text-center">
                        <p className="text-lg font-semibold text-white">Analyzing your answers...</p>
                        <div className="mt-4 flex items-center gap-2">
                          {[0, 1, 2].map((dot) => (
                            <motion.span
                              key={dot}
                              className="h-2.5 w-2.5 rounded-full bg-sky-300"
                              animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                              transition={{
                                duration: 0.9,
                                repeat: Number.POSITIVE_INFINITY,
                                delay: dot * 0.12,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : currentQuizQuestion.id === "category_id" && categoriesLoading ? (
                      <div className="flex min-h-[16rem] flex-col items-center justify-center text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-sky-300" />
                        <p className="helper-text mt-4 text-sm text-white/70">Loading categories...</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {(currentQuizQuestion.id === "category_id"
                          ? displayCategories.map((category) => ({
                              value: category.id,
                              label: category.name,
                            })).concat([{ value: "other", label: "Other — Something else" }])
                          : currentQuizQuestion.options
                        ).map((option, index) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              handleAnswer(
                                currentQuizQuestion.id as keyof OnboardingQuizAnswers,
                                option.value
                              )
                            }
                            className={`quiz-option w-full rounded-[22px] border px-5 py-5 text-left text-base transition-all ${
                              currentAnswer === option.value
                                ? "selected border-white bg-blue-700 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                                : "border-white/70 bg-white text-primary-blue hover:border-white hover:bg-blue-700 hover:text-white"
                            }`}
                          >
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                              {String.fromCharCode(65 + index)}
                            </span>
                            {option.label}
                          </button>
                        ))}
                        {currentAnswer === "other" ? (
                          <div className="rounded-[22px] border border-white/25 bg-white/10 p-4">
                            <input
                              type="text"
                              value={currentOtherValue}
                              onChange={(event) =>
                                handleOtherAnswerChange(
                                  currentOtherField as keyof OnboardingQuizAnswers,
                                  event.target.value
                                )
                              }
                              placeholder="Tell us a little more"
                              className="h-11 w-full rounded-2xl border border-white/35 bg-white/10 px-4 text-sm text-white placeholder:text-white/65 outline-none transition focus:border-white focus:ring-4 focus:ring-white/15"
                            />
                            <button
                              type="button"
                              onClick={submitOtherAnswer}
                              className="mt-3 inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-primary-blue transition hover:bg-white/90"
                            >
                              Continue
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={() => void skipPersonalization()}
                disabled={onboardingLoading}
                className="mt-4 block w-full text-center text-sm text-white/80 transition hover:text-white disabled:opacity-70"
              >
                Skip personalisation
              </button>
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
                <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-white" />
                  <span>✨ Your personalized path is ready</span>
                </div>
                <h2 className="mb-1 text-3xl font-black text-white">Here&apos;s where to start</h2>
                <p className="text-sm text-white/70">We picked these based on your answers.</p>
              </div>

              {error ? (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="mb-4 rounded-[28px] border border-white/20 bg-primary-blue p-6">
                <div className="mb-5">
                  <h3 className="text-lg font-black text-white">Recommended courses for you</h3>
                  <p className="text-sm text-white/72">
                    Start with the courses that best match your level and category.
                  </p>
                </div>

                <div className="grid gap-4">
                  {roadmapCourses.map((course) => (
                    <div
                      key={course.id}
                      className="overflow-hidden rounded-[24px] border border-white/25 bg-white/10"
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
                          <span className="rounded-full bg-sky-300/14 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                            {course.level.replace("_", " ")}
                          </span>
                          <span className="text-xs font-medium text-white/55">{course.categoryName}</span>
                        </div>
                        <div>
                          <p className="line-clamp-2 text-base font-bold text-white">{course.title}</p>
                          <p className="mt-2 line-clamp-2 text-sm text-white/72">
                            {course.shortDescription || course.description}
                          </p>
                        </div>
                        <Link
                          href={`/courses/${course.slug}`}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-primary-blue transition hover:bg-white/90"
                        >
                          View Course
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {roadmapCourses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 px-5 py-6 text-center text-sm text-white/70">
                    We couldn&apos;t find an exact match, so we&apos;ll show featured courses in your workspace.
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() =>
                  void completeOnboarding("/dashboard", {
                    recommendationIds: roadmapCourses.map((course) => course.id),
                  })
                }
                disabled={onboardingLoading}
                className="block w-full rounded-2xl bg-white py-4 text-center text-sm font-bold text-primary-blue transition hover:bg-white/90 disabled:opacity-70"
              >
                Enter your workspace →
              </button>
              <Link
                href="/courses"
                className="mt-3 block w-full text-center text-sm text-white/72 transition hover:text-white"
              >
                Skip and browse all courses
              </Link>
              <button
                type="button"
                onClick={() => void handleRedoQuiz()}
                disabled={onboardingLoading}
                className="mt-3 block w-full text-center text-sm text-white/70 underline transition hover:text-white disabled:opacity-70"
              >
                Redo personalisation quiz
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </AuthShell>
  );
}
