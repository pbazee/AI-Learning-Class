import { env } from "@/lib/config";

const DEFAULT_AFTER_AUTH = "/dashboard";

type PostAuthProfile = {
  role?: string | null;
  createdAt?: string | Date | null;
  onboardingCompleted?: boolean | null;
  onboardingCompletedAt?: string | Date | null;
};

export function sanitizeAuthRedirectPath(path: string | null | undefined) {
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }

  return DEFAULT_AFTER_AUTH;
}

export function buildAuthCallbackUrl(nextPath: string = DEFAULT_AFTER_AUTH) {
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUrl = new URL("/auth/callback", appUrl);

  redirectUrl.searchParams.set("next", sanitizeAuthRedirectPath(nextPath));

  return redirectUrl.toString();
}

export function resolvePostAuthDestination(nextPath: string, profile?: PostAuthProfile | null) {
  if (nextPath !== DEFAULT_AFTER_AUTH) {
    return nextPath;
  }

  if (profile?.role && ["ADMIN", "SUPER_ADMIN"].includes(profile.role)) {
    return "/admin";
  }

  if (!profile?.onboardingCompleted && !profile?.onboardingCompletedAt) {
    return "/signup?step=quiz";
  }

  return nextPath;
}

export { DEFAULT_AFTER_AUTH };
