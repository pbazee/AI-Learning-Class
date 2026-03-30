import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function sanitizeNextPath(path: string | null) {
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }

  return "/dashboard";
}

function getPostAuthDestination(nextPath: string, role?: string | null) {
  if (nextPath !== "/dashboard") {
    return nextPath;
  }

  return role && ["ADMIN", "SUPER_ADMIN"].includes(role) ? "/admin" : nextPath;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "magiclink" | "email" | "recovery" | null;
  const next = sanitizeNextPath(searchParams.get("next"));

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Route handler cookie writes can fail during static evaluation.
          }
        },
      },
    }
  );

  async function syncUserProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return syncAuthenticatedUser(user);
    }

    return null;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const profile = await syncUserProfile();
      return NextResponse.redirect(`${origin}${getPostAuthDestination(next, profile?.role)}`);
    }

    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      const profile = await syncUserProfile();
      return NextResponse.redirect(`${origin}${getPostAuthDestination(next, profile?.role)}`);
    }

    return NextResponse.redirect(`${origin}/login?error=magic_link_failed`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
