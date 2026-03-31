import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getPrimaryAdminEmail, normalizeEmail } from "@/lib/admin-email";

const protectedPaths = ["/dashboard", "/admin", "/checkout", "/affiliate/dashboard"];
const authPaths = ["/login", "/signup", "/sign-in", "/sign-up"];
type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    return NextResponse.redirect(loginUrl);
  }

  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/admin") && user) {
    const userEmail = normalizeEmail(user.email);
    const primaryAdminEmail = getPrimaryAdminEmail();

    if (userEmail !== primaryAdminEmail) {
      const { data: profile } = await supabase
        .from("User")
        .select("role")
        .or(`id.eq.${user.id},email.eq.${userEmail}`)
        .limit(1)
        .maybeSingle();

      if (!profile || !["ADMIN", "SUPER_ADMIN"].includes(profile.role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
