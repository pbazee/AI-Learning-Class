import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NEWSLETTER_OPT_IN_COOKIE, subscribeEmailToNewsletter } from "@/lib/newsletter";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import {
  resolvePostAuthDestination,
  sanitizeAuthRedirectPath,
} from "@/lib/auth-redirect";
import { env } from "@/lib/config";
import { createSupabaseServerClientWithCookies } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "magiclink" | "email" | "recovery" | null;
  const next = sanitizeAuthRedirectPath(searchParams.get("next"));

  const cookieStore = await cookies();
  const shouldSyncNewsletter = cookieStore.get(NEWSLETTER_OPT_IN_COOKIE)?.value === "1";

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const supabase = createSupabaseServerClientWithCookies({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      } catch {
        // Route handler cookie writes can fail during static evaluation.
      }
    },
  });

  async function syncUserProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (shouldSyncNewsletter && user.email) {
        await subscribeEmailToNewsletter({
          email: user.email,
          name:
            typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : typeof user.user_metadata?.name === "string"
                ? user.user_metadata.name
                : null,
        }).catch((error) => {
          console.warn("[auth.callback] Unable to sync newsletter opt-in after OAuth.", error);
        });
      }

      const profile = await syncAuthenticatedUser(user);
      const onboardingProfile = profile as {
        onboardingCompleted?: boolean | null;
        onboardingCompletedAt?: Date | string | null;
      } | null;

      return profile
        ? {
            role: profile.role,
            createdAt: profile.createdAt,
            onboardingCompleted: Boolean(onboardingProfile?.onboardingCompleted),
            onboardingCompletedAt:
              onboardingProfile?.onboardingCompletedAt ??
              (typeof user.user_metadata?.onboarding_completed_at === "string"
                ? user.user_metadata.onboarding_completed_at
                : null),
          }
        : null;
    }

    return null;
  }

  function finalizeRedirect(response: NextResponse) {
    if (shouldSyncNewsletter) {
      response.cookies.set(NEWSLETTER_OPT_IN_COOKIE, "", {
        path: "/",
        maxAge: 0,
      });
    }

    return response;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const profile = await syncUserProfile();
      if (profile && !profile.onboardingCompleted && !profile.onboardingCompletedAt) {
        return finalizeRedirect(
          NextResponse.redirect(new URL("/signup?step=quiz", request.url))
        );
      }
      return finalizeRedirect(
        NextResponse.redirect(`${origin}${resolvePostAuthDestination(next, profile)}`)
      );
    }

    return finalizeRedirect(NextResponse.redirect(`${origin}/login?error=oauth_failed`));
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      if (type === "recovery") {
        return finalizeRedirect(NextResponse.redirect(`${origin}/reset-password`));
      }

      const profile = await syncUserProfile();
      if (profile && !profile.onboardingCompleted && !profile.onboardingCompletedAt) {
        return finalizeRedirect(
          NextResponse.redirect(new URL("/signup?step=quiz", request.url))
        );
      }
      return finalizeRedirect(
        NextResponse.redirect(`${origin}${resolvePostAuthDestination(next, profile)}`)
      );
    }

    return finalizeRedirect(
      NextResponse.redirect(`${origin}/login?error=magic_link_failed`)
    );
  }

  return finalizeRedirect(
    NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  );
}
