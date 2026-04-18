import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { finalizeCheckoutOrder } from "@/lib/payments";
import { logger } from "@/lib/logger";
import { env } from "@/lib/config";

async function getStripeReceiptUrl(
  stripe: Stripe,
  paymentIntentId?: string | null
) {
  if (!paymentIntentId) {
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    const latestCharge = paymentIntent.latest_charge;

    if (latestCharge && typeof latestCharge !== "string") {
      return latestCharge.receipt_url ?? null;
    }
  } catch (error) {
    logger.warn("[stripe.confirm] Unable to load Stripe receipt URL.", error);
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing Stripe checkout session." },
        { status: 400 }
      );
    }

    if (!env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const stripeSubscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : null;

    const paymentConfirmed =
      session.mode === "subscription"
        ? session.status === "complete"
        : session.payment_status === "paid";

    if (!paymentConfirmed) {
      return NextResponse.json(
        { error: "Stripe has not confirmed this payment yet." },
        { status: 400 }
      );
    }

    const receiptUrl = await getStripeReceiptUrl(
      stripe,
      typeof session.payment_intent === "string" ? session.payment_intent : null
    );

    await finalizeCheckoutOrder({
      gateway: "stripe",
      orderId: session.metadata?.order_id,
      providerReference: session.id,
      planSlug: session.metadata?.plan_slug || stripeSubscription?.metadata?.plan_slug,
      couponCode: session.metadata?.applied_coupon,
      affiliateCode: session.metadata?.aff_code,
      customerEmail: session.customer_email,
      customerId: typeof session.customer === "string" ? session.customer : null,
      stripeSubscriptionId:
        typeof session.subscription === "string" ? session.subscription : null,
      currentPeriodStart: stripeSubscription
        ? new Date(stripeSubscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: stripeSubscription
        ? new Date(stripeSubscription.current_period_end * 1000)
        : null,
      billingCycle:
        stripeSubscription?.items.data[0]?.price.recurring?.interval === "year"
          ? "yearly"
          : stripeSubscription
            ? "monthly"
            : null,
      receiptUrl,
    });

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    logger.error("[stripe.confirm] Unable to confirm Stripe checkout.", error);
    return NextResponse.json(
      { error: "Unable to confirm Stripe payment." },
      { status: 500 }
    );
  }
}
