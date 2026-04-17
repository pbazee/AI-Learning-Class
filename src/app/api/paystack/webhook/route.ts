import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  finalizeCheckoutOrder,
  markCheckoutOrderFailedByProviderReference,
} from "@/lib/payments";

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    status?: string;
    reference?: string;
    metadata?: {
      order_id?: string;
      plan_slug?: string;
      billing_cycle?: string;
      applied_coupon?: string;
      aff_code?: string;
    };
    customer?: {
      email?: string;
    };
  };
};

function isValidPaystackSignature(rawBody: string, signature?: string | null) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

  if (!secretKey || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "utf8"),
    Buffer.from(signature, "utf8")
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json(
      { error: "Paystack webhook is not configured." },
      { status: 400 }
    );
  }

  try {
    if (!isValidPaystackSignature(rawBody, signature)) {
      return NextResponse.json(
        { error: "Invalid Paystack webhook signature." },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody) as PaystackWebhookPayload;

    if (payload.event === "charge.success" && payload.data?.reference) {
      await finalizeCheckoutOrder({
        gateway: "paystack",
        orderId: payload.data.metadata?.order_id,
        providerReference: payload.data.reference,
        planSlug: payload.data.metadata?.plan_slug,
        billingCycle: payload.data.metadata?.billing_cycle,
        couponCode: payload.data.metadata?.applied_coupon,
        affiliateCode: payload.data.metadata?.aff_code,
        customerEmail: payload.data.customer?.email ?? null,
      });
    }

    if (
      payload.event === "charge.failed" &&
      typeof payload.data?.reference === "string"
    ) {
      await markCheckoutOrderFailedByProviderReference(payload.data.reference);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[paystack.webhook] Unable to process Paystack webhook.", error);
    return NextResponse.json(
      { error: "Unable to process Paystack webhook." },
      { status: 400 }
    );
  }
}
