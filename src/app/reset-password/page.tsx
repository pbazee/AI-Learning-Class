"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Sparkles } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { DEFAULT_SITE_NAME } from "@/lib/site";
import { getSupabaseClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkChecked, setLinkChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setSessionReady(true);
        setError("");
      }
    });

    async function validateRecoverySession() {
      const searchParams = new URLSearchParams(window.location.search);
      const hasRecoveryHints =
        window.location.hash.includes("access_token") ||
        window.location.hash.includes("type=recovery") ||
        searchParams.has("token_hash") ||
        searchParams.get("type") === "recovery";

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (session) {
        setSessionReady(true);
        setLinkChecked(true);
        return;
      }

      if (hasRecoveryHints) {
        window.setTimeout(async () => {
          const {
            data: { session: retriedSession },
          } = await supabase.auth.getSession();

          if (!mounted) {
            return;
          }

          if (retriedSession) {
            setSessionReady(true);
            setError("");
          } else {
            setError("This password reset link is invalid or has expired. Please request a new one.");
          }

          setLinkChecked(true);
        }, 1200);
        return;
      }

      if (!mounted) {
        return;
      }

      if (!session) {
        setError("This password reset link is invalid or has expired. Please request a new one.");
      }
      setLinkChecked(true);
    }

    void validateRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    setSuccess(true);

    window.setTimeout(() => {
      router.push("/login?reset=success");
    }, 1600);
  }

  return (
    <AuthShell
      badge="Password Recovery"
      backHref="/login"
      backLabel="Back to login"
      siteName={DEFAULT_SITE_NAME}
      subtitle="Create a fresh password for your account and return to your courses with a clean, secure session."
      title="Set a new password"
    >
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.22)] sm:p-7">
        {!linkChecked || (!sessionReady && !error) ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-sky-700" />
            <div>
              <p className="text-base font-semibold text-slate-950">Verifying reset link</p>
              <p className="mt-2 text-sm text-slate-700">We&apos;re preparing a secure session so you can choose a new password.</p>
            </div>
          </div>
        ) : error && !sessionReady ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.14em] text-rose-700/80">
              Request a fresh reset email to continue.
            </p>
            <Link
              href="/forgot-password"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 transition hover:text-sky-700"
            >
              Request a new link
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : success ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Sparkles className="h-8 w-8 text-emerald-700" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-950">Password updated</p>
              <p className="mt-2 text-sm text-slate-700">Redirecting you to sign in with your new password.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-slate-950 placeholder:text-slate-500 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
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

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  required
                  placeholder="Repeat your new password"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-slate-950 placeholder:text-slate-500 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-900"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating password
                </>
              ) : (
                <>
                  Update Password
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
