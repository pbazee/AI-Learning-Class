import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { buildCheckoutQuote, type CheckoutGateway, type CheckoutItemInput } from "@/lib/checkout";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { syncAuthenticatedUser } from "@/lib/auth-user-sync";

function getAppOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

function getPaystackCurrency(country?: string) {
  switch ((country || "").toUpperCase()) {
    case "NG":
      return "NGN";
    case "GH":
      return "GHS";
    case "KE":
      return "KES";
    case "ZA":
      return "ZAR";
    default:
      return "USD";
  }
}

async function createPaypalAccessToken() {
  if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal is not configured.");
  }

  const isLive = (process.env.PAYPAL_MODE || "sandbox").trim().toLowerCase() === "live";
  const baseUrl = isLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const auth = Buffer.from(
    `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Unable to authenticate with PayPal.");
  }

  const payload = await response.json();
  return {
    accessToken: payload.access_token as string,
    baseUrl,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const method = body.method as CheckoutGateway;
    const items = Array.isArray(body.items) ? (body.items as CheckoutItemInput[]) : [];
    const planSlug = typeof body.planSlug === "string" ? body.planSlug : null;
    const customerEmail =
      typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
    const customerName =
      typeof body.customerName === "string" ? body.customerName.trim() : "";
    const country = typeof body.country === "string" ? body.country : "US";

    if (!["stripe", "paypal", "paystack"].includes(method)) {
      return NextResponse.json({ error: "Choose a valid payment gateway." }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const dbUser = user ? await syncAuthenticatedUser(user) : null;
    const quote = await buildCheckoutQuote({
      request,
      items,
      planSlug,
      user: dbUser ? { earnedDiscountCode: dbUser.earnedDiscountCode } : null,
    });

    if (quote.items.length === 0) {
      return NextResponse.json({ error: "Your checkout is empty." }, { status: 400 });
    }

    if (quote.total <= 0) {
      return NextResponse.json({
        url: `${getAppOrigin(request)}/courses?price=free`,
      });
    }

    const origin = getAppOrigin(request);
    const checkoutLabel =
      quote.items.length === 1 ? quote.items[0].title : `AI Learning Class Order (${quote.items.length} items)`;
    const cancelUrl = quote.planSlug ? `${origin}/checkout?plan=${quote.planSlug}` : `${origin}/checkout`;
    const affCode = request.cookies.get("aff_code")?.value ?? null;

    if (method === "stripe") {
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: "Stripe is not configured." }, { status: 400 });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: checkoutLabel,
              },
              unit_amount: Math.round(quote.total * 100),
            },
            quantity: 1,
          },
        ],
        customer_email: customerEmail || dbUser?.email || undefined,
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&gateway=stripe`,
        cancel_url: cancelUrl,
        metadata: {
          source: "ai-learning-class",
          gateway: "stripe",
          customer_name: customerName,
          plan_slug: quote.planSlug ?? "",
          applied_coupon: quote.appliedCouponCode ?? "",
          ...(affCode ? { aff_code: affCode } : {}),
        },
      });

      return NextResponse.json({ url: session.url, sessionId: session.id });
    }

    if (method === "paypal") {
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
                currency_code: "USD",
                value: quote.total.toFixed(2),
              },
              description: checkoutLabel.slice(0, 127),
              custom_id: quote.appliedCouponCode ?? undefined,
            },
          ],
          payer: customerEmail ? { email_address: customerEmail } : undefined,
          application_context: {
            brand_name: "AI Learning Class",
            user_action: "PAY_NOW",
            return_url: `${origin}/checkout/complete?gateway=paypal`,
            cancel_url: cancelUrl,
          },
        }),
      });

      const payload = await response.json();
      const approvalUrl = payload.links?.find((entry: { rel: string; href: string }) => entry.rel === "approve")?.href;

      if (!response.ok || !approvalUrl) {
        return NextResponse.json({ error: payload?.message || "Unable to start PayPal checkout." }, { status: 400 });
      }

      return NextResponse.json({ url: approvalUrl, sessionId: payload.id });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Paystack is not configured." }, { status: 400 });
    }

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: customerEmail || dbUser?.email,
        amount: Math.round(quote.total * 100),
        currency: getPaystackCurrency(country),
        metadata: {
          source: "ai-learning-class",
          customer_name: customerName,
          plan_slug: quote.planSlug ?? undefined,
          applied_coupon: quote.appliedCouponCode ?? undefined,
          ...(affCode ? { aff_code: affCode } : {}),
        },
        callback_url: `${origin}/checkout/complete?gateway=paystack`,
      }),
    });

    const paystackPayload = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackPayload?.status) {
      return NextResponse.json(
        { error: paystackPayload?.message || "Unable to start Paystack checkout." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      url: paystackPayload.data.authorization_url,
      sessionId: paystackPayload.data.reference,
    });
  } catch (error) {
    console.error("[checkout.session] Unable to create checkout session.", error);
    return NextResponse.json({ error: "Unable to start checkout right now." }, { status: 500 });
  }
}
