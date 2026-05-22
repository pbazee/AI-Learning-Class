"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app.error] Route-level failure:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-blue">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-black text-foreground">
          We hit a temporary issue loading this page.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          The app is still available. You can retry this screen or head back home while we keep the
          experience resilient.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
