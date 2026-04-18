// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  finalizeCheckoutOrder,
  syncManagedStripeSubscription,
} from "@/lib/payments";
import { logger } from "@/lib/logger";
import { env } from "@/lib/config";

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

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        const subscription =
          typeof session.subscription === "string"
            ? await stripe.subscriptions.retrieve(session.subscription)
            : null;
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
          planSlug: session.metadata?.plan_slug || subscription?.metadata?.plan_slug,
          couponCode: session.metadata?.applied_coupon,
          affiliateCode: session.metadata?.aff_code,
          customerEmail: session.customer_email,
          customerId: typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId:
            typeof session.subscription === "string" ? session.subscription : null,
          currentPeriodStart: subscription
            ? new Date(subscription.current_period_start * 1000)
            : null,
          currentPeriodEnd: subscription
            ? new Date(subscription.current_period_end * 1000)
            : null,
          billingCycle:
            subscription?.items.data[0]?.price.recurring?.interval === "year"
              ? "yearly"
              : subscription
                ? "monthly"
                : null,
          receiptUrl,
        });

        logger.info("[stripe.webhook] Payment completed for:", session.customer_email);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as import("stripe").Stripe.Subscription;

        await syncManagedStripeSubscription({
          stripeSubscriptionId: subscription.id,
          customerId: typeof subscription.customer === "string" ? subscription.customer : null,
          status:
            subscription.status === "active"
              ? "ACTIVE"
              : subscription.status === "trialing"
                ? "TRIALING"
                : subscription.status === "past_due"
                  ? "PAST_DUE"
                  : "CANCELLED",
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          billingCycle:
            subscription.items.data[0]?.price.recurring?.interval === "year"
              ? "yearly"
              : "monthly",
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as { id?: string };
        logger.warn("[stripe.webhook] Payment failed for invoice:", invoice.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as import("stripe").Stripe.Subscription;

        await syncManagedStripeSubscription({
          stripeSubscriptionId: subscription.id,
          customerId: typeof subscription.customer === "string" ? subscription.customer : null,
          status: "CANCELLED",
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          billingCycle:
            subscription.items.data[0]?.price.recurring?.interval === "year"
              ? "yearly"
              : "monthly",
        });

        logger.info("[stripe.webhook] Subscription cancelled");
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error("[stripe.webhook] Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const config = { api: { bodyParser: false } };
