const DEFAULT_AFTER_AUTH = "/dashboard";

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
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUrl = new URL("/auth/callback", appUrl);

  redirectUrl.searchParams.set("next", sanitizeAuthRedirectPath(nextPath));

  return redirectUrl.toString();
}

export function resolvePostAuthDestination(nextPath: string, role?: string | null) {
  if (nextPath !== DEFAULT_AFTER_AUTH) {
    return nextPath;
  }

  return role && ["ADMIN", "SUPER_ADMIN"].includes(role) ? "/admin" : nextPath;
}

export { DEFAULT_AFTER_AUTH };
