import { NextRequest, NextResponse } from "next/server";
import {
  buildCheckoutQuote,
  CheckoutQuoteError,
  type CheckoutItemInput,
} from "@/lib/checkout";
import { withRequestTiming } from "@/lib/server-performance";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

export async function POST(request: NextRequest) {
  return withRequestTiming("api.checkout.quote", async () => {
    try {
      const body = await request.json().catch(() => ({}));
      const items = Array.isArray(body.items) ? (body.items as CheckoutItemInput[]) : [];
      const planSlug = typeof body.planSlug === "string" ? body.planSlug : null;
      const gateway = typeof body.method === "string" ? body.method : null;
      const country = typeof body.country === "string" ? body.country : null;
      const couponCode =
        typeof body.couponCode === "string" ? body.couponCode : null;
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const dbUser = user ? await syncAuthenticatedUser(user) : null;
      const quote = await buildCheckoutQuote({
        request,
        items,
        planSlug,
        gateway,
        country,
        couponCode,
        preferredCurrency: dbUser?.preferredCurrency ?? null,
        user: dbUser ? { earnedDiscountCode: dbUser.earnedDiscountCode } : null,
        userId: dbUser?.id ?? null,
      });

      return NextResponse.json({ quote });
    } catch (error) {
      console.error("[checkout.quote] Unable to build checkout quote.", error);
      const message =
        error instanceof CheckoutQuoteError
          ? error.message
          : "Unable to build your checkout summary right now.";
      const status = error instanceof CheckoutQuoteError ? 400 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
