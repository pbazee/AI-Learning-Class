"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Check, Sparkles, AlertCircle } from "lucide-react";
import { SiteLogo } from "@/components/layout/SiteLogo";
import {
  buildAuthCallbackUrl,
  DEFAULT_AFTER_AUTH,
  sanitizeAuthRedirectPath,
} from "@/lib/auth-redirect";
import { DEFAULT_SITE_NAME } from "@/lib/site";
import { createClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const quizQuestions = [
  {
    id: "q1",
    question: "What's your current AI experience level?",
    options: ["Complete beginner", "Some coding experience", "Data science background", "Experienced ML practitioner"],
  },
  {
    id: "q2",
    question: "What's your primary goal?",
    options: ["Land an AI job", "Build AI products", "Research & academia", "Understand AI for my business"],
  },
  {
    id: "q3",
    question: "How much time can you dedicate weekly?",
    options: ["1–3 hours", "4–7 hours", "8–15 hours", "15+ hours"],
  },
  {
    id: "q4",
    question: "Which AI domain excites you most?",
    options: ["Generative AI & LLMs", "Machine Learning", "Computer Vision", "AI Engineering & MLOps"],
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
    const supabase = createClient();
    await syncNewsletterPreference(email, name);
    logger.debug("[signup] Starting Google OAuth, redirectTo:", buildAuthCallbackUrl(redirectPath));

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: buildAuthCallbackUrl(redirectPath) },
    });

    if (error) {
      console.error("[signup] Google OAuth error:", error.message);
      setError(error.message);
      setLoading(false);
    }
    // On success Supabase redirects the browser automatically
  }

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    logger.info("[signup] Creating account for:", email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: buildAuthCallbackUrl(redirectPath),
      },
    });

    if (error) {
      console.error("[signup] signUp error:", error.message);
      setError(error.message);
      setLoading(false);
      return;
    }

    logger.debug("[signup] signUp response — user:", { userId: data.user?.id, hasSession: !!data.session });

    // If Supabase email confirmation is enabled, no session yet → show confirm message
    if (data.user && !data.session) {
      void syncNewsletterPreference(email, name);
      logger.info("[signup] Email confirmation required, check inbox");
      setEmailConfirmSent(true);
      setLoading(false);
      return;
    }

    // Auto-confirmed (email confirmation disabled in Supabase) → proceed to quiz
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
    const newAnswers = { ...answers, [questionId]: answerIdx };
    setAnswers(newAnswers);
    if (quizStep < quizQuestions.length - 1) {
      setTimeout(() => setQuizStep((p) => p + 1), 300);
    } else {
      setTimeout(() => setStep("roadmap"), 500);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden py-12">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center">
            <SiteLogo
              siteName={branding.siteName}
              logoUrl={branding.logoUrl || undefined}
              compact
              textClassName="text-foreground"
            />
          </Link>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {["account", "quiz", "roadmap"].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s
                  ? "bg-blue-600 text-white"
                  : ["account", "quiz", "roadmap"].indexOf(step) > i
                  ? "bg-blue-100 dark:bg-blue-950/40 text-blue-600"
                  : "bg-muted text-muted-foreground"
              }`}>
                {["account", "quiz", "roadmap"].indexOf(step) > i ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 transition-all ${["account", "quiz", "roadmap"].indexOf(step) > i ? "bg-blue-400" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Account */}
          {step === "account" && (
            <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-foreground mb-1">Start learning for free</h1>
                <p className="text-muted-foreground text-sm">Join 500K+ AI learners worldwide</p>
              </div>

              {emailConfirmSent ? (
                <div className="bg-card border border-border rounded-2xl shadow-sm p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-foreground font-bold mb-2">Confirm your email</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click it to activate your account and start learning.
                  </p>
                  <button
                    type="button"
                    onClick={() => setEmailConfirmSent(false)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
                  {/* Error banner */}
                  {error && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm mb-6">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm font-medium hover:bg-muted disabled:opacity-60 transition-colors mb-6"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
                    ) : (
                      <GoogleIcon className="h-5 w-5" />
                    )}
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-border" /><span className="text-xs text-muted-foreground">or</span><div className="flex-1 h-px bg-border" />
                  </div>

                  <form onSubmit={handleAccountSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder-muted-foreground outline-none text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder-muted-foreground outline-none text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 8 characters"
                          className="w-full pl-10 pr-10 py-3 rounded-xl bg-background border border-border text-foreground placeholder-muted-foreground outline-none text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 transition-all" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <label className="flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-3">
                      <input
                        type="checkbox"
                        checked={newsletterOptIn}
                        onChange={(event) => setNewsletterOptIn(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary-blue focus:ring-primary-blue"
                      />
                      <span className="text-xs leading-5 text-muted-foreground">
                        Get notified on more offers, discounts & new AI trends
                      </span>
                    </label>
                    <button type="submit" disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    <p className="text-center text-xs text-muted-foreground">
                      By signing up you agree to our <Link href="/terms" className="text-blue-600 hover:underline">Terms</Link> and <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                    </p>
                  </form>
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link
                  href={
                    redirectPath !== DEFAULT_AFTER_AUTH
                      ? `/login?redirect=${encodeURIComponent(redirectPath)}`
                      : "/login"
                  }
                  className="text-blue-600 hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </motion.div>
          )}

          {/* STEP 2: Quiz */}
          {step === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 mb-3">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">60-second AI quiz</span>
                </div>
                <h2 className="text-xl font-black text-foreground mb-1">Personalize your roadmap</h2>
                <p className="text-muted-foreground text-sm">4 quick questions to build your perfect learning path</p>
              </div>

              <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
                {/* Quiz progress */}
                <div className="flex gap-1.5 mb-6">
                  {quizQuestions.map((_, i) => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= quizStep ? "bg-blue-600" : "bg-muted"}`} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={quizStep} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <p className="text-sm text-muted-foreground mb-1">Question {quizStep + 1} of {quizQuestions.length}</p>
                    <h3 className="text-lg font-bold text-foreground mb-6">{quizQuestions[quizStep].question}</h3>
                    <div className="space-y-3">
                      {quizQuestions[quizStep].options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(quizQuestions[quizStep].id, idx)}
                          className={`w-full text-left px-5 py-4 rounded-xl border text-sm transition-all ${
                            answers[quizQuestions[quizStep].id] === idx
                              ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-foreground"
                              : "border-border bg-background text-foreground hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                          }`}
                        >
                          <span className="font-semibold text-blue-600 mr-3">{String.fromCharCode(65 + idx)}.</span>
                          {option}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Roadmap */}
          {step === "roadmap" && (
            <motion.div key="roadmap" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-black text-foreground mb-1">Your AI roadmap is ready!</h2>
                <p className="text-muted-foreground text-sm">Based on your answers, here&apos;s your personalized learning path</p>
              </div>

              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 mb-4">
                <div className="space-y-3">
                  {roadmapSuggestions.default.map((course, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                        i === 0 ? "bg-blue-100 dark:bg-blue-950/50 text-blue-600" :
                        i === 1 ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600" :
                        i === 2 ? "bg-pink-100 dark:bg-pink-950/50 text-pink-600" : "bg-amber-100 dark:bg-amber-950/50 text-amber-600"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{course}</p>
                        <p className="text-xs text-muted-foreground">{["Start here", "Level up", "Advanced", "Production"][i]}</p>
                      </div>
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/dashboard"
                className="block text-center w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors">
                Go to My Dashboard →
              </Link>
              <button onClick={() => setStep("quiz")} className="block text-center w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Retake quiz
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
