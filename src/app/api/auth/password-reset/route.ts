import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? sanitizeText(value).trim().toLowerCase() : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const redirectTo =
      typeof body.redirectTo === "string" && body.redirectTo.trim()
        ? body.redirectTo.trim()
        : `${request.nextUrl.origin}/reset-password`;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo,
        },
      });

      if (error) {
        throw error;
      }

      const resetHref = data.properties?.action_link;

      if (resetHref) {
        await sendPasswordResetEmail({
          userId: user?.id ?? null,
          email,
          name: user?.name ?? null,
          resetHref,
        });
      }
    } catch (error) {
      captureException(error, {
        userId: user?.id ?? null,
        route: "api.auth.password-reset",
        extra: { email },
      });
      logger.error("[auth.password-reset] Unable to generate recovery link.", error);
      // Deliberately fall through to a generic success response to avoid account enumeration.
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, password reset instructions have been sent.",
    });
  } catch (error) {
    captureException(error, { route: "api.auth.password-reset" });
    logger.error("[auth.password-reset] Unexpected password reset error.", error);
    return NextResponse.json(
      { error: "Unable to process the password reset request right now." },
      { status: 500 }
    );
  }
}
