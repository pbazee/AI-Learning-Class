"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { DEFAULT_SITE_NAME } from "@/lib/site";
import { getSupabaseClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const supabase = getSupabaseClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        throw error;
      }

      setStatus("success");
      setMessage("Password reset instructions have been sent to your email address.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to send reset instructions.");
    }
  }

  return (
    <AuthShell
      badge="Account Recovery"
      backHref="/login"
      backLabel="Back to login"
      siteName={DEFAULT_SITE_NAME}
      subtitle="Enter the email tied to your account and we will send a secure link to choose a new password."
      title="Reset your password"
    >
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.22)]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="forgot-password-email"
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="forgot-password-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="you@example.com"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 placeholder:text-slate-500 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending reset link
              </>
            ) : (
              <>
                Send reset instructions
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {message ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
              status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <p>{message}</p>
            {status === "success" ? (
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-emerald-700/80">
                Check your inbox and click the reset link. You will be taken to a page to set your new password.
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-6 text-sm text-slate-700">
          Remembered your password?{" "}
          <Link href="/login" className="font-semibold text-slate-950 transition hover:text-sky-700">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
