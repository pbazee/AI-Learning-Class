// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const customerEmail = session.customer_email;
        const affCode = session.metadata?.aff_code as string | undefined;
        const totalAmount = (session.amount_total ?? 0) / 100;

        // Create affiliate conversion if referral exists
        if (affCode && totalAmount > 0) {
          const affiliate = await prisma.affiliate.findUnique({
            where: { affiliateCode: affCode },
          });

          if (affiliate && affiliate.status === "active") {
            const program = await prisma.affiliateProgram.findFirst();
            const rate = program?.commissionRate ?? 20;
            const commission = parseFloat(((totalAmount * rate) / 100).toFixed(2));

            await prisma.affiliateConversion.create({
              data: {
                affiliateId: affiliate.id,
                orderId: session.id,
                amount: totalAmount,
                commission,
                status: "pending",
              },
            });

            await prisma.affiliate.update({
              where: { id: affiliate.id },
              data: {
                totalConversions: { increment: 1 },
                totalEarnings: { increment: commission },
                pendingPayout: { increment: commission },
              },
            });
          }
        }

        console.log("✅ Payment completed for:", customerEmail);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        console.log("❌ Payment failed for invoice:", invoice.id);
        break;
      }

      case "customer.subscription.deleted": {
        console.log("📭 Subscription cancelled");
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const config = { api: { bodyParser: false } };
