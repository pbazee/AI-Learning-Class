import { NextRequest, NextResponse } from "next/server";
import { finalizeCheckoutOrder } from "@/lib/payments";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";

    if (!reference) {
      return NextResponse.json({ error: "Missing Paystack reference." }, { status: 400 });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Paystack is not configured." }, { status: 400 });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });
    const payload = await response.json();

    if (!response.ok || payload?.data?.status !== "success") {
      return NextResponse.json({ error: payload?.message || "Unable to verify Paystack payment." }, { status: 400 });
    }

    await finalizeCheckoutOrder({
      gateway: "paystack",
      orderId: payload?.data?.metadata?.order_id,
      providerReference: payload.data.reference,
      planSlug: payload?.data?.metadata?.plan_slug,
      billingCycle: payload?.data?.metadata?.billing_cycle,
      couponCode: payload?.data?.metadata?.applied_coupon,
      affiliateCode: payload?.data?.metadata?.aff_code,
      customerEmail: payload?.data?.customer?.email ?? null,
    });

    return NextResponse.json({ success: true, sessionId: payload.data.reference });
  } catch (error) {
    console.error("[paystack.verify] Unable to verify Paystack payment.", error);
    return NextResponse.json({ error: "Unable to verify Paystack payment." }, { status: 500 });
  }
}
