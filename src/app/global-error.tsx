"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[app.global-error] Unhandled application failure:", error);

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-xl rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-blue">
              Unexpected error
            </p>
            <h1 className="mt-3 text-3xl font-black text-foreground">
              The app ran into a problem, but it did not fully crash.
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Retry this screen or jump back to the homepage. This boundary keeps the experience
              recoverable instead of leaving a blank failure page.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Retry
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
              >
                Back home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
