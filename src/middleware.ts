import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getPrimaryAdminEmail, normalizeEmail } from "@/lib/admin-email";
import { env } from "@/lib/config";

function getMetadataRole(metadata: unknown) {
  if (metadata && typeof metadata === "object" && "role" in metadata) {
    const role = (metadata as { role?: unknown }).role;

    if (typeof role === "string") {
      return role;
    }
  }

  return null;
}

function getAuthRole(
  user:
    | {
        app_metadata?: unknown;
        user_metadata?: unknown;
      }
    | null
    | undefined
) {
  const appRole = getMetadataRole(user?.app_metadata);

  if (appRole) {
    return appRole;
  }

  return getMetadataRole(user?.user_metadata);
}

function isAdminRole(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

const protectedPaths = ["/dashboard", "/admin", "/checkout", "/affiliate/dashboard", "/settings"];
const authPaths = ["/login", "/signup", "/sign-in", "/sign-up"];
type RateLimitRule = {
  id: string;
  limit: number;
  windowMs: number;
  message: string;
};
type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};
type RateLimitBucket = {
  count: number;
  resetAt: number;
};
type RateLimitResult = {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  exceeded: boolean;
};

const rateLimitState = globalThis as typeof globalThis & {
  __alcRateLimitBuckets?: Map<string, RateLimitBucket>;
  __alcRateLimitLastSweepAt?: number;
};

function getRateLimitStore() {
  rateLimitState.__alcRateLimitBuckets ??= new Map<string, RateLimitBucket>();
  return rateLimitState.__alcRateLimitBuckets;
}

function sweepRateLimitStore(now: number) {
  const lastSweepAt = rateLimitState.__alcRateLimitLastSweepAt ?? 0;

  if (now - lastSweepAt < 30_000) {
    return;
  }

  const store = getRateLimitStore();

  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }

  rateLimitState.__alcRateLimitLastSweepAt = now;
}

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();

  return forwardedFor || realIp || cloudflareIp || "unknown-client";
}

function getApiRateLimitRule(request: NextRequest): RateLimitRule | null {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  if (
    pathname === "/api/stripe/webhook" ||
    pathname === "/api/paypal/webhook" ||
    pathname === "/api/paystack/webhook"
  ) {
    return null;
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
    return {
      id: "auth-login",
      limit: 6,
      windowMs: 15 * 60 * 1000,
      message: "Too many login attempts. Please wait a few minutes and try again.",
    };
  }

  if (pathname.startsWith("/api/team/workspace")) {
    return {
      id: "team-workspace",
      limit: 30,
      windowMs: 5 * 60 * 1000,
      message: "Too many Teams workspace requests. Please slow down and try again shortly.",
    };
  }

  if (pathname.startsWith("/api/checkout/")) {
    return {
      id: "checkout",
      limit: 20,
      windowMs: 5 * 60 * 1000,
      message: "Too many checkout requests. Please wait a moment and try again.",
    };
  }

  if (pathname === "/api/contact/messages" || pathname === "/api/newsletter/subscribe") {
    return {
      id: "forms",
      limit: 10,
      windowMs: 10 * 60 * 1000,
      message: "Too many form submissions. Please wait before trying again.",
    };
  }

  if (pathname.startsWith("/api/ask-ai")) {
    return {
      id: "ask-ai",
      limit: 30,
      windowMs: 5 * 60 * 1000,
      message: "Too many Ask AI requests. Please wait a moment and try again.",
    };
  }

  return {
    id: "api-general",
    limit: 120,
    windowMs: 60 * 1000,
    message: "Too many API requests. Please wait a moment and try again.",
  };
}

function consumeRateLimit(
  rule: RateLimitRule,
  clientIdentifier: string,
  pathname: string
): RateLimitResult {
  const now = Date.now();
  sweepRateLimitStore(now);

  const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
  const resetAt = windowStart + rule.windowMs;
  const bucketKey = `${rule.id}:${pathname}:${clientIdentifier}:${windowStart}`;
  const store = getRateLimitStore();
  const existingBucket = store.get(bucketKey);

  if (existingBucket && existingBucket.resetAt > now) {
    existingBucket.count += 1;
    store.set(bucketKey, existingBucket);

    return {
      limit: rule.limit,
      remaining: Math.max(rule.limit - existingBucket.count, 0),
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existingBucket.resetAt - now) / 1000)),
      exceeded: existingBucket.count > rule.limit,
    };
  }

  store.set(bucketKey, {
    count: 1,
    resetAt,
  });

  return {
    limit: rule.limit,
    remaining: Math.max(rule.limit - 1, 0),
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    exceeded: false,
  };
}

function applyRateLimitHeaders(response: NextResponse, result: RateLimitResult) {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  response.headers.set("Retry-After", String(result.retryAfterSeconds));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rateLimitRule = getApiRateLimitRule(request);
  const rateLimitResult = rateLimitRule
    ? consumeRateLimit(rateLimitRule, getClientIdentifier(request), pathname)
    : null;

  if (rateLimitRule && rateLimitResult?.exceeded) {
    const response = NextResponse.json(
      { error: rateLimitRule.message },
      { status: 429 }
    );
    applyRateLimitHeaders(response, rateLimitResult);
    return response;
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const response = NextResponse.next();
    if (rateLimitResult) {
      applyRateLimitHeaders(response, rateLimitResult);
    }
    return response;
  }

  let response = NextResponse.next({ request });

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    response = NextResponse.redirect(loginUrl);
    if (rateLimitResult) {
      applyRateLimitHeaders(response, rateLimitResult);
    }
    return response;
  }

  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));
  if (isAuthPage && user) {
    const userEmail = normalizeEmail(user.email);
    const destination =
      userEmail === getPrimaryAdminEmail() || isAdminRole(getAuthRole(user))
        ? "/admin"
        : "/dashboard";
    response = NextResponse.redirect(new URL(destination, request.url));
    if (rateLimitResult) {
      applyRateLimitHeaders(response, rateLimitResult);
    }
    return response;
  }

  if (pathname.startsWith("/admin") && user) {
    const userEmail = normalizeEmail(user.email);
    const primaryAdminEmail = getPrimaryAdminEmail();
    const authRole = getAuthRole(user);

    if (userEmail !== primaryAdminEmail && !isAdminRole(authRole)) {
      response = NextResponse.redirect(new URL("/dashboard", request.url));
      if (rateLimitResult) {
        applyRateLimitHeaders(response, rateLimitResult);
      }
      return response;
    }
  }

  if (rateLimitResult) {
    applyRateLimitHeaders(response, rateLimitResult);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|api/stripe/webhook|api/paypal/webhook|api/paystack/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
