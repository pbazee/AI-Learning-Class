"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { SiteLogo } from "@/components/layout/SiteLogo";
import {
  buildAuthCallbackUrl,
  DEFAULT_AFTER_AUTH,
  sanitizeAuthRedirectPath,
} from "@/lib/auth-redirect";
import { DEFAULT_SITE_NAME } from "@/lib/site";
import { createClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";

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

// Wrap useSearchParams in its own component so Suspense boundary works correctly
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = sanitizeAuthRedirectPath(searchParams.get("redirect"));
  const callbackError = searchParams.get("error");

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
  const [error, setError] = useState<string | null>(
    callbackError === "oauth_failed" ? "Google sign-in failed. Please try again." :
    callbackError === "magic_link_failed" ? "Your magic link expired or is invalid. Please request a new one." :
    callbackError === "auth_callback_failed" ? "Authentication failed. Please try again." :
    null
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
        // Auth pages fall back to the default brand mark if settings are unavailable.
      }
    }

    void loadBranding();

    return () => {
      mounted = false;
    };
  }, []);

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
    const supabase = createClient();
    await syncNewsletterPreference(email);
    logger.debug("[login] Starting Google OAuth, redirectTo:", buildAuthCallbackUrl(redirectPath));

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: buildAuthCallbackUrl(redirectPath) },
    });

    if (error) {
      console.warn("[login] Google OAuth error:", error.message);
      setError(error.message);
      setLoading(false);
    }
    // On success Supabase redirects the browser — no further action needed
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
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
          <h1 className="text-2xl font-black text-foreground mt-6 mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Sign in to continue your AI learning journey</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm mb-6">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-background border border-border text-foreground text-sm font-medium hover:bg-muted disabled:opacity-60 transition-colors mb-6"
          >
            {loading && !magicSent ? (
              <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
            {(["password", "magic"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setMagicSent(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "magic" ? "✨ Magic Link" : "🔑 Password"}
              </button>
            ))}
          </div>

          {magicSent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-foreground font-bold mb-2">Check your email!</h3>
              <p className="text-muted-foreground text-sm mb-4">
                We sent a magic link to <strong className="text-foreground">{email}</strong>. Click it to sign in instantly.
              </p>
              <button
                type="button"
                onClick={() => setMagicSent(false)}
                className="text-xs text-blue-600 hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder-muted-foreground outline-none text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              {mode === "password" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot password</Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-background border border-border text-foreground placeholder-muted-foreground outline-none text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === "magic" ? "Send Magic Link" : "Sign In"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href={
              redirectPath !== DEFAULT_AFTER_AUTH
                ? `/signup?redirect=${encodeURIComponent(redirectPath)}`
                : "/signup"
            }
            className="text-blue-600 hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginPageInner />
    </Suspense>
  );
}
