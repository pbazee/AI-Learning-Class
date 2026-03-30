// src/app/api/paystack/initialize/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, amount, currency = "NGN", metadata } = await req.json();

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Paystack not configured. Set PAYSTACK_SECRET_KEY in .env.local" }, { status: 400 });
    }

    const amountInKobo = Math.round(amount * 100); // Paystack uses kobo

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        currency,
        metadata: {
          ...metadata,
          source: "ai-learning-class",
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Paystack initialization failed");
    }

    return NextResponse.json({
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (error: any) {
    console.error("Paystack error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
