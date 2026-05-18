"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AffiliateDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[affiliate-dashboard.error] Route-level failure:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-blue">
          Affiliate dashboard issue
        </p>
        <h1 className="mt-3 text-3xl font-black text-foreground">
          We hit a temporary issue loading your affiliate dashboard.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Try again now, or go back to the affiliate page while the data connection recovers.
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
            href="/affiliate"
            className="inline-flex items-center justify-center rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            Back to affiliate page
          </Link>
        </div>
      </div>
    </div>
  );
}
