import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  buildCheckoutQuote,
  CheckoutQuoteError,
  type CheckoutGateway,
  type CheckoutItemInput,
} from "@/lib/checkout";
import type { BillingCycle } from "@/lib/site";
import {
  getPaystackChannels,
  getPaystackMinimumAmount,
} from "@/lib/checkout-currency";
import {
  attachProviderReferenceToOrder,
  createPendingCheckoutOrder,
  encodeProviderState,
  markCheckoutOrderFailed,
} from "@/lib/payments";
import { createPaypalAccessToken } from "@/lib/paypal";
import { withRequestTiming } from "@/lib/server-performance";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";
import { prisma } from "@/lib/prisma";

import { env } from "@/lib/config";
import { logger } from "@/lib/logger";

function getAppOrigin(request: NextRequest) {
  return env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  return withRequestTiming("api.checkout.session", async () => {
    try {
    const body = await request.json().catch(() => ({}));
    const method = body.method as CheckoutGateway;
    const items = Array.isArray(body.items)
      ? (body.items as CheckoutItemInput[])
      : [];
    const planSlug = typeof body.planSlug === "string" ? body.planSlug : null;
    const billingCycle =
      body.billingCycle === "yearly" ? ("yearly" as BillingCycle) : ("monthly" as BillingCycle);
    const customerEmail =
      typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
    const customerName =
      typeof body.customerName === "string" ? body.customerName.trim() : "";
    const country = typeof body.country === "string" ? body.country : "US";
    const couponCode =
      typeof body.couponCode === "string" ? body.couponCode : null;

    if (!["stripe", "paypal", "paystack"].includes(method)) {
      return NextResponse.json(
        { error: "Choose a valid payment gateway." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const dbUser = user ? await syncAuthenticatedUser(user) : null;

    if (!dbUser) {
      return NextResponse.json(
        { error: "Please sign in before checking out." },
        { status: 401 }
      );
    }

    const quote = await buildCheckoutQuote({
      request,
      items,
      planSlug,
      billingCycle,
      gateway: method,
      country,
      couponCode,
      preferredCurrency: dbUser.preferredCurrency,
      user: { earnedDiscountCode: dbUser.earnedDiscountCode },
      userId: dbUser.id,
    });

    if (quote.items.length === 0) {
      return NextResponse.json(
        { error: "Your checkout is empty." },
        { status: 400 }
      );
    }

    if (quote.total <= 0) {
      return NextResponse.json({
        url: `${getAppOrigin(request)}/courses?price=free`,
      });
    }

    if (method === "paystack") {
      const minimumAmount = getPaystackMinimumAmount(quote.currency);

      if (quote.total < minimumAmount) {
        return NextResponse.json(
          {
            error: `Paystack requires at least ${quote.currency} ${minimumAmount.toFixed(2)} for this checkout. Increase the order total or use another payment method.`,
          },
          { status: 400 }
        );
      }
    }

    const origin = getAppOrigin(request);
    const isPlanCheckout = Boolean(quote.planSlug);
    const checkoutLabel =
      quote.items.length === 1
        ? quote.items[0].title
        : `AI Genius Lab Order (${quote.items.length} items)`;
    const cancelUrl = quote.planSlug
      ? `${origin}/checkout?plan=${quote.planSlug}&billing=${quote.billingCycle ?? "monthly"}`
      : `${origin}/checkout`;
    const affiliateCode = request.cookies.get("aff_code")?.value ?? null;
    const pendingOrder = await createPendingCheckoutOrder({
      userId: dbUser.id,
      gateway: method,
      quote,
    });
    const providerState = encodeProviderState({
      orderId: pendingOrder.id,
      planSlug: quote.planSlug,
      billingCycle: quote.billingCycle,
      couponCode: quote.appliedCouponCode,
      affiliateCode,
    });

    if (method === "stripe") {
      if (!env.STRIPE_SECRET_KEY) {
        return NextResponse.json(
          { error: "Stripe is not configured." },
          { status: 400 }
        );
      }

      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
          apiVersion: "2024-06-20",
        });
        const session = await stripe.checkout.sessions.create({
          mode: isPlanCheckout ? "subscription" : "payment",
          line_items: isPlanCheckout
            ? [
                {
                  price_data: {
                    currency: quote.currency.toLowerCase(),
                    product_data: {
                      name: checkoutLabel,
                    },
                    recurring: {
                      interval: quote.billingCycle === "yearly" ? "year" : "month",
                    },
                    unit_amount: Math.round(quote.total * 100),
                  },
                  quantity: 1,
                },
              ]
            : [
                {
                  price_data: {
                    currency: quote.currency.toLowerCase(),
                    product_data: {
                      name: checkoutLabel,
                    },
                    unit_amount: Math.round(quote.total * 100),
                  },
                  quantity: 1,
                },
              ],
          customer: dbUser.stripeCustomerId || undefined,
          customer_email: dbUser.stripeCustomerId ? undefined : customerEmail || dbUser.email || undefined,
          success_url: `${origin}/checkout/complete?gateway=stripe&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl,
          metadata: {
            source: "ai-genius-lab",
            gateway: "stripe",
            customer_name: customerName,
            order_id: pendingOrder.id,
            plan_slug: quote.planSlug ?? "",
            billing_cycle: quote.billingCycle ?? "",
            applied_coupon: quote.appliedCouponCode ?? "",
            ...(affiliateCode ? { aff_code: affiliateCode } : {}),
          },
          subscription_data: isPlanCheckout
            ? {
                metadata: {
                  source: "ai-genius-lab",
                  gateway: "stripe",
                  customer_name: customerName,
                  order_id: pendingOrder.id,
                  plan_slug: quote.planSlug ?? "",
                  billing_cycle: quote.billingCycle ?? "",
                  applied_coupon: quote.appliedCouponCode ?? "",
                  ...(affiliateCode ? { aff_code: affiliateCode } : {}),
                },
              }
            : undefined,
        });

        if (typeof session.customer === "string" && session.customer !== dbUser.stripeCustomerId) {
          await prisma.user.updateMany({
            where: { id: dbUser.id },
            data: {
              stripeCustomerId: session.customer,
            },
          });
        }

        await attachProviderReferenceToOrder({
          orderId: pendingOrder.id,
          providerReference: session.id,
        });

        return NextResponse.json({ url: session.url, sessionId: session.id });
      } catch (error) {
        await markCheckoutOrderFailed(pendingOrder.id);
        throw error;
      }
    }

    if (method === "paypal") {
      try {
        const { accessToken, baseUrl } = await createPaypalAccessToken();
        const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
              {
                amount: {
                  currency_code: quote.currency,
                  value: quote.total.toFixed(2),
                },
                description: checkoutLabel.slice(0, 127),
                custom_id: providerState,
              },
            ],
            payer: customerEmail ? { email_address: customerEmail } : undefined,
            application_context: {
              brand_name: "AI Genius Lab",
              user_action: "PAY_NOW",
              return_url: `${origin}/checkout/complete?gateway=paypal`,
              cancel_url: cancelUrl,
            },
          }),
        });

        const payload = await response.json();
        const approvalUrl = payload.links?.find(
          (entry: { rel: string; href: string }) => entry.rel === "approve"
        )?.href;

        if (
          !response.ok ||
          !approvalUrl ||
          typeof payload?.id !== "string"
        ) {
          await markCheckoutOrderFailed(pendingOrder.id);
          return NextResponse.json(
            {
              error:
                payload?.message || "Unable to start PayPal checkout.",
            },
            { status: 400 }
          );
        }

        await attachProviderReferenceToOrder({
          orderId: pendingOrder.id,
          providerReference: payload.id,
        });

        return NextResponse.json({ url: approvalUrl, sessionId: payload.id });
      } catch (error) {
        await markCheckoutOrderFailed(pendingOrder.id);
        throw error;
      }
    }

    if (!env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: "Paystack is not configured." },
        { status: 400 }
      );
    }

    try {
      const paystackResponse = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: customerEmail || dbUser.email,
            amount: Math.round(quote.total * 100),
            currency: quote.currency,
            channels: getPaystackChannels({
              country,
              currency: quote.currency,
            }),
            metadata: {
              source: "ai-genius-lab",
              customer_name: customerName,
              country,
              order_id: pendingOrder.id,
              plan_slug: quote.planSlug ?? undefined,
              billing_cycle: quote.billingCycle ?? undefined,
              applied_coupon: quote.appliedCouponCode ?? undefined,
              ...(affiliateCode ? { aff_code: affiliateCode } : {}),
            },
            callback_url: `${origin}/checkout/complete?gateway=paystack`,
          }),
        }
      );

      const paystackPayload = await paystackResponse.json();

      if (
        !paystackResponse.ok ||
        !paystackPayload?.status ||
        typeof paystackPayload?.data?.authorization_url !== "string" ||
        typeof paystackPayload?.data?.reference !== "string" ||
        typeof paystackPayload?.data?.access_code !== "string"
      ) {
        await markCheckoutOrderFailed(pendingOrder.id);
        return NextResponse.json(
          {
            error:
              paystackPayload?.message ||
              "Unable to start Paystack checkout.",
          },
          { status: 400 }
        );
      }

      await attachProviderReferenceToOrder({
        orderId: pendingOrder.id,
        providerReference: paystackPayload.data.reference,
      });

      return NextResponse.json({
        sessionId: paystackPayload.data.reference,
        url: paystackPayload.data.authorization_url,
      });
    } catch (error) {
      await markCheckoutOrderFailed(pendingOrder.id);
      throw error;
    }
    } catch (error) {
      logger.error("[checkout.session] Unable to create checkout session.", error);
      const message =
        error instanceof CheckoutQuoteError
          ? error.message
          : "Unable to start checkout right now.";
      const status = error instanceof CheckoutQuoteError ? 400 : 500;
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
  });
}

