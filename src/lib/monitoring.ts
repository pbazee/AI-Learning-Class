import * as Sentry from "@sentry/nextjs";

export function captureException(
  error: unknown,
  context?: {
    userId?: string | null;
    planId?: string | null;
    route?: string;
    extra?: Record<string, unknown>;
  }
) {
  Sentry.captureException(error, {
    extra: {
      userId: context?.userId ?? null,
      planId: context?.planId ?? null,
      route: context?.route ?? null,
      ...(context?.extra ?? {}),
    },
  });
}
