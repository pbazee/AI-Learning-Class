import { NextRequest, NextResponse } from "next/server";

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
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";

    if (!orderId) {
      return NextResponse.json({ error: "Missing PayPal order." }, { status: 400 });
    }

    const { accessToken, baseUrl } = await createPaypalAccessToken();
    const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const payload = await response.json();

    if (!response.ok || payload?.status !== "COMPLETED") {
      return NextResponse.json({ error: payload?.message || "Unable to confirm PayPal payment." }, { status: 400 });
    }

    return NextResponse.json({ success: true, sessionId: payload.id });
  } catch (error) {
    console.error("[paypal.capture] Unable to capture PayPal order.", error);
    return NextResponse.json({ error: "Unable to confirm PayPal payment." }, { status: 500 });
  }
}
