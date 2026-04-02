"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

const DEFAULT_AFTER_LOGIN = "/dashboard";

function sanitizeRedirectPath(path: string | null) {
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }

  return DEFAULT_AFTER_LOGIN;
}

function getRedirectTo(nextPath: string = DEFAULT_AFTER_LOGIN) {
  const appUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUrl = new URL("/auth/callback", appUrl);

  redirectUrl.searchParams.set("next", sanitizeRedirectPath(nextPath));

  return redirectUrl.toString();
}

function getPostLoginDestination(redirectPath: string, role?: string) {
  if (redirectPath !== DEFAULT_AFTER_LOGIN) {
    return redirectPath;
  }

  return role && ["ADMIN", "SUPER_ADMIN"].includes(role) ? "/admin" : redirectPath;
}

async function syncSignedInUser() {
  const response = await fetch("/api/auth/sync-user", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to sync the signed-in user.");
  }

  return response.json() as Promise<{ user: { role: string } }>;
}

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
  const redirectPath = sanitizeRedirectPath(searchParams.get("redirect"));
  const callbackError = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [error, setError] = useState<string | null>(
    callbackError === "oauth_failed" ? "Google sign-in failed. Please try again." :
    callbackError === "magic_link_failed" ? "Your magic link expired or is invalid. Please request a new one." :
    callbackError === "auth_callback_failed" ? "Authentication failed. Please try again." :
    null
  );

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
    console.log("[login] Starting Google OAuth, redirectTo:", getRedirectTo(redirectPath));

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getRedirectTo(redirectPath) },
    });

    if (error) {
      console.error("[login] Google OAuth error:", error.message);
      setError(error.message);
      setLoading(false);
    }
    // On success Supabase redirects the browser — no further action needed
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "magic") {
      console.log("[login] Sending magic link to:", email);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: getRedirectTo(redirectPath) },
      });

      if (error) {
        console.error("[login] Magic link error:", error.message);
        setError(error.message);
      } else {
        void syncNewsletterPreference(email);
        console.log("[login] Magic link sent successfully to:", email);
        setMagicSent(true);
      }
    } else {
      console.log("[login] Signing in with password for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("[login] Password sign-in error:", error.message);
        setError(error.message);
      } else {
        void syncNewsletterPreference(email);
        console.log("[login] Signed in successfully, user:", data.user?.id);
        let nextPath = redirectPath;

        try {
          const synced = await syncSignedInUser();
          nextPath = getPostLoginDestination(redirectPath, synced.user.role);
        } catch (syncError) {
          console.warn("[login] User sync after password sign-in failed:", syncError);
        }

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
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-foreground">
              AI Learning <span className="text-blue-600">Class</span>
            </span>
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
          <Link href="/signup" className="text-blue-600 hover:underline font-medium">
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
