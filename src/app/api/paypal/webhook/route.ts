import { NextRequest, NextResponse } from "next/server";
import {
  decodeProviderState,
  finalizeCheckoutOrder,
  markCheckoutOrderFailedByProviderReference,
} from "@/lib/payments";
import {
  capturePaypalOrder,
  getPaypalOrder,
  verifyPaypalWebhook,
} from "@/lib/paypal";

type PaypalWebhookEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
};

function getPaypalOrderId(event: PaypalWebhookEvent) {
  if (typeof event.resource?.supplementary_data?.related_ids?.order_id === "string") {
    return event.resource.supplementary_data.related_ids.order_id;
  }

  if (typeof event.resource?.id === "string") {
    return event.resource.id;
  }

  return null;
}

async function finalizePaypalOrder(orderPayload: any) {
  const providerState = decodeProviderState(
    orderPayload?.purchase_units?.[0]?.custom_id
  );

  await finalizeCheckoutOrder({
    gateway: "paypal",
    orderId: providerState?.orderId,
    providerReference: orderPayload.id,
    planSlug: providerState?.planSlug,
    couponCode: providerState?.couponCode,
    affiliateCode: providerState?.affiliateCode,
    customerEmail: orderPayload?.payer?.email_address ?? null,
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (
    !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    !process.env.PAYPAL_CLIENT_SECRET ||
    !process.env.PAYPAL_WEBHOOK_ID
  ) {
    return NextResponse.json(
      { error: "PayPal webhook is not configured." },
      { status: 400 }
    );
  }

  try {
    const isVerified = await verifyPaypalWebhook(rawBody, request.headers);

    if (!isVerified) {
      return NextResponse.json(
        { error: "Invalid PayPal webhook signature." },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody) as PaypalWebhookEvent;
    const paypalOrderId = getPaypalOrderId(event);

    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED": {
        if (!paypalOrderId) {
          break;
        }

        const payload = await capturePaypalOrder(paypalOrderId);
        await finalizePaypalOrder(payload);
        break;
      }

      case "PAYMENT.CAPTURE.COMPLETED": {
        if (!paypalOrderId) {
          break;
        }

        const payload = await getPaypalOrder(paypalOrderId);
        await finalizePaypalOrder(payload);
        break;
      }

      case "CHECKOUT.PAYMENT-APPROVAL.REVERSED": {
        if (paypalOrderId) {
          await markCheckoutOrderFailedByProviderReference(paypalOrderId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[paypal.webhook] Unable to process PayPal webhook.", error);
    return NextResponse.json(
      { error: "Unable to process PayPal webhook." },
      { status: 400 }
    );
  }
}
