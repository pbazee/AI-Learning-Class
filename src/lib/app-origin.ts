import "server-only";

export type HeadersLike = Pick<Headers, "get">;

export type ResolveAppOriginOptions = {
  appOrigin?: string | null;
  headers?: HeadersLike | null;
  requestUrl?: string | URL | null;
  allowLocal?: boolean;
};

export function getAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function isPublicAppOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function resolveAppOrigin(_options: ResolveAppOriginOptions = {}) {
  return getAppOrigin();
}
