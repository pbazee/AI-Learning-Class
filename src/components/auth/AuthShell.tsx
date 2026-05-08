"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { SiteLogo } from "@/components/layout/SiteLogo";

type AuthShellProps = {
  badge?: string;
  backHref?: string;
  backLabel?: string;
  brandHighlights?: string[];
  children: React.ReactNode;
  logoUrl?: string;
  siteName: string;
  title: string;
  subtitle: string;
  testimonialName?: string;
  testimonialRole?: string;
  testimonialQuote?: string;
};

const defaultHighlights = [
  "Structured AI paths with production-ready projects",
  "Protected lesson previews, progress sync, and team access",
  "Fast, secure authentication with email and Google sign-in",
];

export function AuthShell({
  badge,
  backHref,
  backLabel,
  brandHighlights = defaultHighlights,
  children,
  logoUrl,
  siteName,
  subtitle,
  testimonialName = "Learners worldwide",
  testimonialQuote = "A cleaner, calmer way to get from AI-curious to shipping real work.",
  testimonialRole = "Trusted by ambitious builders",
  title,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,#07111f_0%,#091524_38%,#f7f8fb_38%,#f7f8fb_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-16 h-48 w-48 rounded-full bg-sky-400/18 blur-3xl" />
        <div className="absolute right-[6%] top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" />
      </div>

      <main className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.1fr_minmax(0,560px)] lg:px-8 lg:py-8">
        <section className="hidden min-h-[720px] flex-col justify-between overflow-hidden rounded-[32px] border border-white/10 bg-[#07111f] p-10 text-white shadow-[0_40px_140px_-60px_rgba(2,6,23,0.85)] lg:flex">
          <div>
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="inline-flex items-center">
                <SiteLogo
                  siteName={siteName}
                  logoUrl={logoUrl}
                  compact
                  textClassName="text-white"
                />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/78">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                Premium Access
              </div>
            </div>

            <div className="mt-16 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/88">
                AI Learning, Reframed
              </p>
              <h1 className="mt-4 text-5xl font-black leading-[0.94] text-white">
                Serious learning infrastructure for modern AI builders.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
                Move from curiosity to execution with polished learning flows, clean collaboration,
                and a classroom that feels as thoughtful as the work you want to ship.
              </p>
            </div>

            <div className="mt-10 grid gap-4">
              {brandHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                  <p className="text-sm leading-6 text-slate-200">{highlight}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <Zap className="h-5 w-5 text-amber-300" />
                <p className="mt-6 text-2xl font-black text-white">Fast</p>
                <p className="mt-1 text-sm text-slate-300">Low-friction sign-in and onboarding.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <p className="mt-6 text-2xl font-black text-white">Secure</p>
                <p className="mt-1 text-sm text-slate-300">Recovery, previews, and protected content.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <Sparkles className="h-5 w-5 text-cyan-300" />
                <p className="mt-6 text-2xl font-black text-white">Refined</p>
                <p className="mt-1 text-sm text-slate-300">Purposeful visuals inspired by the best SaaS flows.</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6">
              <p className="text-lg leading-8 text-white">"{testimonialQuote}"</p>
              <div className="mt-5">
                <p className="text-sm font-semibold text-white">{testimonialName}</p>
                <p className="text-sm text-slate-300">{testimonialRole}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-3rem)] items-center justify-center lg:min-h-0">
          <div className="w-full max-w-[560px] rounded-[32px] border border-white/16 bg-slate-950/42 p-6 shadow-[0_34px_100px_-44px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
            <div className="lg:hidden">
              <Link href="/" className="inline-flex items-center">
                <SiteLogo
                  siteName={siteName}
                  logoUrl={logoUrl}
                  compact
                  textClassName="text-white"
                />
              </Link>
            </div>

            {backHref && backLabel ? (
              <Link
                href={backHref}
                className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-200 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Link>
            ) : null}

            {badge ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/35 bg-sky-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100">
                <Sparkles className="h-3.5 w-3.5" />
                {badge}
              </div>
            ) : null}

            <div className="mt-5">
              <h2 className="text-3xl font-black tracking-[-0.03em] text-white">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-200">{subtitle}</p>
            </div>

            <div className="mt-8">{children}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
