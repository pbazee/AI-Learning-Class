import { NextRequest, NextResponse } from "next/server";
import { getPrimaryAdminEmail, normalizeEmail } from "@/lib/admin-email";
import { env } from "@/lib/config";
import {
  createSupabaseServerClientWithCookies,
  type CookieToSet,
} from "@/lib/supabase-server";

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
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rateLimitKey =
    request.headers.get("CF-Ray") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  void rateLimitKey;

  // TODO: Implement Cloudflare KV rate limiting after deployment
  // Current: rate limiting disabled for Cloudflare Workers compatibility

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createSupabaseServerClientWithCookies({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet: CookieToSet[]) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)
      );
    },
  });

  let user = null;

  try {
    const authResult = await supabase.auth.getUser();
    user = authResult.data.user;
  } catch (error) {
    console.warn("[middleware] Unable to resolve the current Supabase user.", error);
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));
  if (isAuthPage && user) {
    const isOnboardingRoute =
      (pathname === "/signup" || pathname === "/sign-up") &&
      typeof user.user_metadata?.onboarding_completed_at !== "string";

    if (isOnboardingRoute) {
      return response;
    }

    const userEmail = normalizeEmail(user.email);
    const destination =
      userEmail === getPrimaryAdminEmail() || isAdminRole(getAuthRole(user))
        ? "/admin"
        : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (pathname.startsWith("/admin") && user) {
    const userEmail = normalizeEmail(user.email);
    const primaryAdminEmail = getPrimaryAdminEmail();
    const authRole = getAuthRole(user);

    if (userEmail !== primaryAdminEmail && !isAdminRole(authRole)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|api/stripe/webhook|api/paypal/webhook|api/paystack/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
