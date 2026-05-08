"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  buildAuthCallbackUrl,
  DEFAULT_AFTER_AUTH,
  sanitizeAuthRedirectPath,
} from "@/lib/auth-redirect";
import { logger } from "@/lib/logger";
import { DEFAULT_SITE_NAME } from "@/lib/site";
import { getSupabaseClient } from "@/lib/supabase";

const quizQuestions = [
  {
    id: "q1",
    question: "What's your current AI experience level?",
    options: [
      "Complete beginner",
      "Some coding experience",
      "Data science background",
      "Experienced ML practitioner",
    ],
  },
  {
    id: "q2",
    question: "What's your primary goal?",
    options: [
      "Land an AI job",
      "Build AI products",
      "Research & academia",
      "Understand AI for my business",
    ],
  },
  {
    id: "q3",
    question: "How much time can you dedicate weekly?",
    options: ["1-3 hours", "4-7 hours", "8-15 hours", "15+ hours"],
  },
  {
    id: "q4",
    question: "Which AI domain excites you most?",
    options: [
      "Generative AI & LLMs",
      "Machine Learning",
      "Computer Vision",
      "AI Engineering & MLOps",
    ],
  },
];

const roadmapSuggestions: Record<string, string[]> = {
  default: [
    "AI for Everyone: Non-Technical Bootcamp",
    "Complete Machine Learning Mastery",
    "LLM Engineering: Build Production AI Apps",
    "MLOps: Production ML Systems at Scale",
  ],
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

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const redirectPath = sanitizeAuthRedirectPath(searchParams.get("redirect"));
  const [step, setStep] = useState<"account" | "quiz" | "roadmap">("account");
  const [showPassword, setShowPassword] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
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
    logger.debug("[signup] Starting Google OAuth, redirectTo:", buildAuthCallbackUrl(redirectPath));

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: buildAuthCallbackUrl(redirectPath) },
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
        emailRedirectTo: buildAuthCallbackUrl(redirectPath),
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

    if (quizStep < quizQuestions.length - 1) {
      setTimeout(() => setQuizStep((previous) => previous + 1), 300);
    } else {
      setTimeout(() => setStep("roadmap"), 500);
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
        <div className="mb-8 flex items-center gap-2">
          {["account", "quiz", "roadmap"].map((currentStep, index) => (
            <div key={currentStep} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step === currentStep
                    ? "bg-slate-950 text-white"
                    : ["account", "quiz", "roadmap"].indexOf(step) > index
                      ? "bg-sky-100 text-sky-700"
                      : "bg-white/10 text-slate-200"
                }`}
              >
                {["account", "quiz", "roadmap"].indexOf(step) > index ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {index < 2 ? (
                <div
                  className={`h-0.5 flex-1 transition-all ${
                    ["account", "quiz", "roadmap"].indexOf(step) > index ? "bg-sky-500" : "bg-slate-200"
                  }`}
                />
              ) : null}
            </div>
          ))}
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
                      <label className="auth-label mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
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
                          className="auth-input h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 placeholder:text-slate-600 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="auth-label mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
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
                          className="auth-input h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 placeholder:text-slate-600 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="auth-label mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
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
                          className="auth-input h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-slate-950 placeholder:text-slate-600 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
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
                      <span className="auth-helper-text text-xs leading-5 text-slate-800">
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

                    <p className="auth-helper-text text-center text-xs text-slate-800">
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

              <p className="auth-helper-text mt-6 text-center text-sm text-slate-200">
                Already have an account?{" "}
                <Link
                  href={
                    redirectPath !== DEFAULT_AFTER_AUTH
                      ? `/login?redirect=${encodeURIComponent(redirectPath)}`
                      : "/login"
                  }
                  className="font-semibold text-slate-950 transition hover:text-sky-700"
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
                    <p className="mb-1 text-sm text-slate-700">
                      Question {quizStep + 1} of {quizQuestions.length}
                    </p>
                    <h3 className="mb-6 text-lg font-bold text-slate-950">
                      {quizQuestions[quizStep].question}
                    </h3>
                    <div className="space-y-3">
                      {quizQuestions[quizStep].options.map((option, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleAnswer(quizQuestions[quizStep].id, index)}
                          className={`w-full rounded-xl border px-5 py-4 text-left text-sm transition-all ${
                            answers[quizQuestions[quizStep].id] === index
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

              <div className="mb-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.22)]">
                <div className="space-y-3">
                  {roadmapSuggestions.default.map((course, index) => (
                    <div key={index} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                          index === 0
                            ? "bg-sky-100 text-sky-700"
                            : index === 1
                              ? "bg-indigo-100 text-indigo-700"
                              : index === 2
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-slate-950">{course}</p>
                        <p className="text-xs text-slate-700">
                          {["Start here", "Level up", "Advanced", "Production"][index]}
                        </p>
                      </div>
                      <Check className="h-4 w-4 shrink-0 text-sky-700" />
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/dashboard"
                className="block w-full rounded-2xl bg-slate-950 py-4 text-center text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Go to My Dashboard -&gt;
              </Link>
              <button
                type="button"
                onClick={() => setStep("quiz")}
                className="mt-3 block w-full text-center text-sm text-slate-700 transition hover:text-slate-950"
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
