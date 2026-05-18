"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AffiliateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[affiliate.error] Route-level failure:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-blue">
          Affiliate issue
        </p>
        <h1 className="mt-3 text-3xl font-black text-foreground">
          We hit a temporary issue loading the affiliate page.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Try again for a fresh request, or head back home while the connection stabilizes.
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
