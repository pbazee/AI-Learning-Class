// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { items, successUrl, cancelUrl, customerEmail } = await req.json();
    const affCode = req.cookies.get("aff_code")?.value ?? null;

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured. Set STRIPE_SECRET_KEY in .env.local" }, { status: 400 });
    }

    // Dynamic import to avoid errors when Stripe key is not set
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

    const lineItems = items.map((item: { title: string; price: number; thumbnailUrl?: string }) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          images: item.thumbnailUrl ? [item.thumbnailUrl] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customerEmail,
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
      metadata: { source: "ai-learning-class", ...(affCode ? { aff_code: affCode } : {}) },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
