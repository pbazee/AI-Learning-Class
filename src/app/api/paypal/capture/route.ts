import { NextRequest, NextResponse } from "next/server";
import { decodeProviderState, finalizeCheckoutOrder } from "@/lib/payments";
import { capturePaypalOrder } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";

    if (!orderId) {
      return NextResponse.json({ error: "Missing PayPal order." }, { status: 400 });
    }

    const payload = await capturePaypalOrder(orderId);

    const providerState = decodeProviderState(
      payload?.purchase_units?.[0]?.custom_id
    );

    await finalizeCheckoutOrder({
      gateway: "paypal",
      orderId: providerState?.orderId,
      providerReference: payload.id,
      planSlug: providerState?.planSlug,
      billingCycle: providerState?.billingCycle,
      couponCode: providerState?.couponCode,
      affiliateCode: providerState?.affiliateCode,
      customerEmail:
        payload?.payer?.email_address ??
        request.headers.get("x-user-email") ??
        null,
    });

    return NextResponse.json({ success: true, sessionId: payload.id });
  } catch (error) {
    console.error("[paypal.capture] Unable to capture PayPal order.", error);
    return NextResponse.json({ error: "Unable to confirm PayPal payment." }, { status: 500 });
  }
}
