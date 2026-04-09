import "server-only";

export type HeadersLike = Pick<Headers, "get">;

type ResolveAppOriginOptions = {
  appOrigin?: string | null;
  headers?: HeadersLike | null;
  requestUrl?: string | URL | null;
  allowLocal?: boolean;
};

function isIpv4Address(value: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);
}

function isPrivateIpv4Address(value: string) {
  if (!isIpv4Address(value)) {
    return false;
  }

  const [first = 0, second = 0] = value.split(".").map((segment) => Number.parseInt(segment, 10));

  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized.endsWith(".local") ||
    isPrivateIpv4Address(normalized)
  );
}

function normalizeOriginCandidate(candidate?: string | URL | null) {
  if (!candidate) {
    return null;
  }

  const rawValue = String(candidate).trim();

  if (!rawValue) {
    return null;
  }

  try {
    const url = new URL(
      /^https?:\/\//i.test(rawValue)
        ? rawValue
        : `${isLocalHostname(rawValue.split("/")[0]?.split(":")[0] ?? "") ? "http" : "https"}://${rawValue}`
    );

    return url.origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isPublicAppOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return !isLocalHostname(url.hostname);
  } catch {
    return false;
  }
}

export function resolveAppOrigin(options: ResolveAppOriginOptions = {}) {
  const requestOrigin = normalizeOriginCandidate(options.requestUrl);
  const forwardedHost = options.headers?.get("x-forwarded-host") ?? options.headers?.get("host");
  const forwardedProto =
    options.headers?.get("x-forwarded-proto") ??
    (forwardedHost && isLocalHostname(forwardedHost.split(":")[0] ?? "") ? "http" : "https");
  const forwardedOrigin = forwardedHost
    ? normalizeOriginCandidate(
        /^https?:\/\//i.test(forwardedHost) ? forwardedHost : `${forwardedProto}://${forwardedHost}`
      )
    : null;

  const envCandidates = [
    normalizeOriginCandidate(options.appOrigin ?? process.env.NEXT_PUBLIC_APP_URL),
    normalizeOriginCandidate(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    normalizeOriginCandidate(process.env.VERCEL_URL),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const requestCandidates = [forwardedOrigin, requestOrigin].filter(
    (candidate): candidate is string => Boolean(candidate)
  );
  const publicCandidate = [...requestCandidates, ...envCandidates].find(isPublicAppOrigin);

  if (publicCandidate) {
    return publicCandidate;
  }

  if (options.allowLocal === false) {
    return envCandidates[0] ?? "http://localhost:3000";
  }

  return requestCandidates[0] ?? envCandidates[0] ?? "http://localhost:3000";
}
