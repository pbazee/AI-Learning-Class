"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  buildAuthCallbackUrl,
  DEFAULT_AFTER_AUTH,
  sanitizeAuthRedirectPath,
} from "@/lib/auth-redirect";
import { logger } from "@/lib/logger";
import { DEFAULT_SITE_NAME } from "@/lib/site";
import { getSupabaseClient } from "@/lib/supabase";

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

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = sanitizeAuthRedirectPath(searchParams.get("redirect"));
  const callbackError = searchParams.get("error");
  const resetState = searchParams.get("reset");

  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [branding, setBranding] = useState({
    siteName: DEFAULT_SITE_NAME,
    logoUrl: "",
  });
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [error, setError] = useState<string | null>(
    callbackError === "oauth_failed"
      ? "Google sign-in failed. Please try again."
      : callbackError === "magic_link_failed"
        ? "Your magic link expired or is invalid. Please request a new one."
        : callbackError === "auth_callback_failed"
          ? "Authentication failed. Please try again."
          : null
  );

  const successMessage =
    resetState === "success"
      ? "Your password has been updated. Sign in with your new password."
      : null;

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
        // Auth pages fall back to the default brand mark if settings are unavailable.
      } finally {
        if (mounted) {
          setBrandingLoaded(true);
        }
      }
    }

    void loadBranding();

    return () => {
      mounted = false;
    };
  }, []);

  if (!brandingLoaded) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  async function syncNewsletterPreference(nextEmail: string) {
    if (!newsletterOptIn || !nextEmail.trim()) {
      return;
    }

    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail }),
      });
    } catch {
      // Newsletter opt-in should never block authentication.
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    const supabase = getSupabaseClient();
    await syncNewsletterPreference(email);
    logger.debug("[login] Starting Google OAuth, redirectTo:", buildAuthCallbackUrl(redirectPath));

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: buildAuthCallbackUrl(redirectPath) },
    });

    if (oauthError) {
      console.warn("[login] Google OAuth error:", oauthError.message);
      setError(oauthError.message);
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "magic") {
      logger.info("[login] Sending magic link to:", email);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "magic",
          email,
          redirect: redirectPath,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "Unable to send your magic link right now.";
        console.warn("[login] Magic link error:", message);
        setError(message);
      } else {
        void syncNewsletterPreference(email);
        logger.info("[login] Magic link sent successfully to:", email);
        setMagicSent(true);
      }
    } else {
      logger.info("[login] Signing in with password for:", email);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "password",
          email,
          password,
          redirect: redirectPath,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "Unable to sign you in right now.";
        console.warn("[login] Password sign-in error:", message);
        setError(message);
      } else {
        void syncNewsletterPreference(email);
        const nextPath =
          typeof payload?.nextPath === "string" ? payload.nextPath : redirectPath;

        logger.info("[login] Signed in successfully, redirecting to:", nextPath);
        router.push(nextPath);
        router.refresh();
      }
    }

    setLoading(false);
  }

  return (
    <AuthShell
      badge="Welcome Back"
      siteName={branding.siteName}
      logoUrl={branding.logoUrl || undefined}
      title="Sign in with confidence"
      subtitle="Access your courses, saved progress, protected previews, and team workspace from one polished entry point."
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-[28px] border border-white/20 bg-primary-blue p-6 text-white shadow-[0_20px_50px_-38px_rgba(37,99,235,0.42)] sm:p-7">
          {successMessage ? (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          {error ? (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white py-3.5 text-sm font-medium text-primary-blue transition hover:bg-white/90 disabled:opacity-60"
          >
            {loading && !magicSent ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            Continue with Google
          </button>

          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/35" />
            <span className="text-xs uppercase tracking-[0.16em] text-white/55">or</span>
            <div className="h-px flex-1 bg-white/35" />
          </div>

          <div className="mb-6 flex gap-1 rounded-2xl bg-white/10 p-1">
            {(["password", "magic"] as const).map((currentMode) => (
              <button
                key={currentMode}
                type="button"
                onClick={() => {
                  setMode(currentMode);
                  setError(null);
                  setMagicSent(false);
                }}
                className={`flex-1 rounded-[14px] py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                  mode === currentMode
                    ? "bg-white text-primary-blue shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {currentMode === "magic" ? "Magic Link" : "Password"}
              </button>
            ))}
          </div>

          {magicSent ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
                <Mail className="h-8 w-8 text-sky-700" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">Check your email</h3>
              <p className="mb-4 text-sm text-white/85">
                We sent a magic link to <strong className="text-white">{email}</strong>. Click it to sign in instantly.
              </p>
              <button
                type="button"
                onClick={() => setMagicSent(false)}
                className="text-xs font-semibold text-white transition hover:text-white/80"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                    <label className="auth-label mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    className="auth-input h-12 w-full rounded-2xl border border-white/40 bg-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/70 outline-none transition focus:border-white focus:bg-white/15 focus:ring-4 focus:ring-white/15"
                  />
                </div>
              </div>

              {mode === "password" ? (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="auth-label text-xs font-semibold uppercase tracking-[0.14em] text-white">
                      Password
                    </label>
                    <Link href="/forgot-password" className="text-xs font-semibold text-white/70 transition hover:text-white">
                      Forgot password
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      placeholder="Enter your password"
                      className="h-12 w-full rounded-2xl border border-white/40 bg-white/10 pl-11 pr-11 text-sm text-white placeholder:text-white/70 outline-none transition focus:border-white focus:bg-white/15 focus:ring-4 focus:ring-white/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : null}

              <label className="flex items-start gap-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={newsletterOptIn}
                  onChange={(event) => setNewsletterOptIn(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-blue focus:ring-primary-blue"
                />
                <span className="auth-helper-text text-xs leading-5 text-white">
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
                    {mode === "magic" ? "Send Magic Link" : "Sign In"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="auth-helper-text mt-6 text-center text-base text-white">
          Don&apos;t have an account?{" "}
          <Link
            href={
              redirectPath !== DEFAULT_AFTER_AUTH
                ? `/signup?redirect=${encodeURIComponent(redirectPath)}`
                : "/signup"
            }
            className="font-bold text-white underline underline-offset-4 transition hover:text-white/85"
          >
            Sign up
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginPageInner />
    </Suspense>
  );
}
