import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthCallbackUrl,
  resolvePostAuthDestination,
  sanitizeAuthRedirectPath,
} from "@/lib/auth-redirect";
import { checkRateLimit, authRatelimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const limited = await checkRateLimit(authRatelimit, ip);

    if (limited) {
      return new Response("Too many requests", { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "magic" ? "magic" : "password";
    const email = normalizeEmail(typeof body.email === "string" ? sanitizeText(body.email) : "");
    const redirectPath = sanitizeAuthRedirectPath(
      typeof body.redirect === "string" ? body.redirect : null
    );

    if (!email) {
      return NextResponse.json(
        { error: "Enter the email address you want to use." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: buildAuthCallbackUrl(redirectPath),
        },
      });

      if (error) {
        return NextResponse.json(
          { error: error.message || "Unable to send your magic link." },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, mode: "magic" });
    }

    const password = typeof body.password === "string" ? sanitizeText(body.password) : "";

    if (!password) {
      return NextResponse.json(
        { error: "Enter your password to continue." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Invalid email or password." },
        { status: 401 }
      );
    }

    const profile = await syncAuthenticatedUser(data.user);
    const onboardingProfile = profile as {
      onboardingCompleted?: boolean | null;
      onboardingCompletedAt?: Date | string | null;
    } | null;

    if (!profile) {
      return NextResponse.json(
        { error: "Unable to finish signing you in right now." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      nextPath: resolvePostAuthDestination(redirectPath, {
        role: profile.role,
        createdAt: profile.createdAt,
        onboardingCompleted: Boolean(onboardingProfile?.onboardingCompleted),
        onboardingCompletedAt:
          onboardingProfile?.onboardingCompletedAt ??
          (typeof data.user.user_metadata?.onboarding_completed_at === "string"
            ? data.user.user_metadata.onboarding_completed_at
            : null),
      }),
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      },
    });
  } catch (error) {
    console.error("[auth.login] Unable to complete sign-in.", error);
    return NextResponse.json(
      { error: "Unable to complete sign-in right now." },
      { status: 500 }
    );
  }
}
