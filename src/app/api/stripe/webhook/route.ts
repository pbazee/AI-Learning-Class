// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { DEFAULT_AFFILIATE_PROGRAM } from "@/lib/affiliate-program";
import { evaluateAffiliateFraud } from "@/lib/growth-utils";

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
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          });

          if (affiliate && affiliate.status === "active") {
            const existingConversion = await prisma.affiliateConversion.findFirst({
              where: { orderId: session.id },
            });

            if (existingConversion) {
              break;
            }

            const program = (await prisma.affiliateProgram.findFirst()) ?? DEFAULT_AFFILIATE_PROGRAM;
            const rate = program?.commissionRate ?? 20;
            const commission = parseFloat(((totalAmount * rate) / 100).toFixed(2));
            const fraudAssessment = evaluateAffiliateFraud({
              affiliateEmail: affiliate.user.email,
              customerEmail,
              enabled: program.fraudDetectionEnabled ?? true,
            });
            const eligibleAt = new Date(Date.now() + (program.payoutGraceDays ?? 30) * 86400000);
            const creditedAt = fraudAssessment.fraudStatus === "clear" ? new Date() : null;

            await prisma.affiliateConversion.create({
              data: {
                affiliateId: affiliate.id,
                orderId: session.id,
                amount: totalAmount,
                commission,
                status: fraudAssessment.fraudStatus === "flagged" ? "flagged" : "pending",
                fraudStatus: fraudAssessment.fraudStatus,
                fraudReason: fraudAssessment.fraudReason,
                eligibleAt,
                creditedAt,
              },
            });

            if (creditedAt) {
              await prisma.affiliate.update({
                where: { id: affiliate.id },
                data: {
                  totalConversions: { increment: 1 },
                  totalEarnings: { increment: commission },
                  pendingPayout: { increment: commission },
                },
              });
            }

            await createAuditLog({
              actorId: affiliate.userId,
              action:
                fraudAssessment.fraudStatus === "flagged"
                  ? "affiliate_conversion.flagged"
                  : "affiliate_conversion.tracked",
              entityType: "AffiliateConversion",
              entityId: session.id,
              summary:
                fraudAssessment.fraudStatus === "flagged"
                  ? "Affiliate conversion was flagged for review."
                  : "Affiliate conversion was tracked successfully.",
              metadata: {
                affiliateId: affiliate.id,
                orderId: session.id,
                amount: totalAmount,
                commission,
                eligibleAt: eligibleAt.toISOString(),
                fraudReason: fraudAssessment.fraudReason,
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
