import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { finalizeCheckoutOrder } from "@/lib/payments";

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
    console.warn("[stripe.confirm] Unable to load Stripe receipt URL.", error);
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

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
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
      planSlug: session.metadata?.plan_slug,
      couponCode: session.metadata?.applied_coupon,
      affiliateCode: session.metadata?.aff_code,
      customerEmail: session.customer_email,
      receiptUrl,
    });

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error("[stripe.confirm] Unable to confirm Stripe checkout.", error);
    return NextResponse.json(
      { error: "Unable to confirm Stripe payment." },
      { status: 500 }
    );
  }
}
