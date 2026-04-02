// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { finalizeCheckoutOrder } from "@/lib/payments";

async function getStripeReceiptUrl(
  stripe: import("stripe").default,
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
    console.warn("[stripe.webhook] Unable to load Stripe receipt URL.", error);
  }

  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        const receiptUrl = await getStripeReceiptUrl(
          stripe,
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null
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

        console.log("[stripe.webhook] Payment completed for:", session.customer_email);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as { id?: string };
        console.log("[stripe.webhook] Payment failed for invoice:", invoice.id);
        break;
      }

      case "customer.subscription.deleted": {
        console.log("[stripe.webhook] Subscription cancelled");
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[stripe.webhook] Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const config = { api: { bodyParser: false } };
