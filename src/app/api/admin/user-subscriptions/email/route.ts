import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAuditLog } from "@/lib/audit-log";
import { formatPrice } from "@/lib/utils";

type TemplateKey = "renewal_reminder" | "inactive_reactivation" | "expiry_warning";

async function getAdminUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { id: true, role: true, email: true },
  });

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "SUPER_ADMIN")) {
    return null;
  }

  return dbUser;
}

function buildEmailTemplate(template: TemplateKey, subscription: {
  name: string;
  email: string;
  planName: string;
  billingCycle: string;
  currentPeriodEnd: Date;
  revenue: number;
  currency: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const formattedRenewalDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(subscription.currentPeriodEnd);

  switch (template) {
    case "renewal_reminder":
      return {
        subject: `Your ${subscription.planName} renewal is coming up`,
        html: `
          <div style="font-family: Inter, Arial, sans-serif; background:#060814; color:#f8fafc; padding:40px 20px;">
            <div style="max-width:640px; margin:0 auto; background:#0f172a; border:1px solid rgba(148,163,184,0.18); border-radius:24px; padding:32px;">
              <p style="font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#60a5fa; font-weight:700;">Renewal Reminder</p>
              <h1 style="font-size:30px; line-height:1.1; margin:12px 0 16px;">Stay on track with your AI learning momentum.</h1>
              <p style="color:#cbd5e1; line-height:1.7;">Hi ${subscription.name}, your <strong>${subscription.planName}</strong> subscription renews on <strong>${formattedRenewalDate}</strong>.</p>
              <div style="margin:24px 0; border-radius:20px; background:#111827; padding:20px;">
                <p style="margin:0; color:#94a3b8;">Plan</p>
                <p style="margin:6px 0 0; font-size:20px; font-weight:700; color:#fff;">${subscription.planName} | ${subscription.billingCycle}</p>
                <p style="margin:6px 0 0; color:#f8fafc;">${formatPrice(subscription.revenue, subscription.currency)}</p>
              </div>
              <a href="${appUrl}/pricing" style="display:inline-block; background:#f97316; color:#fff; text-decoration:none; padding:14px 20px; border-radius:999px; font-weight:700;">Review My Plan</a>
            </div>
          </div>
        `,
      };
    case "inactive_reactivation":
      return {
        subject: `Pick up where you left off in AI Genius Lab`,
        html: `
          <div style="font-family: Inter, Arial, sans-serif; background:#060814; color:#f8fafc; padding:40px 20px;">
            <div style="max-width:640px; margin:0 auto; background:#0f172a; border:1px solid rgba(148,163,184,0.18); border-radius:24px; padding:32px;">
              <p style="font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#fb923c; font-weight:700;">Reactivation</p>
              <h1 style="font-size:30px; line-height:1.1; margin:12px 0 16px;">Your next AI breakthrough is still waiting.</h1>
              <p style="color:#cbd5e1; line-height:1.7;">Hi ${subscription.name}, we noticed your <strong>${subscription.planName}</strong> membership has been quiet recently. Come back for fresh lessons, updated tools, and practical workflows you can apply immediately.</p>
              <a href="${appUrl}/dashboard" style="display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:14px 20px; border-radius:999px; font-weight:700;">Return To My Dashboard</a>
            </div>
          </div>
        `,
      };
    case "expiry_warning":
      return {
        subject: `Action needed: your subscription expires on ${formattedRenewalDate}`,
        html: `
          <div style="font-family: Inter, Arial, sans-serif; background:#060814; color:#f8fafc; padding:40px 20px;">
            <div style="max-width:640px; margin:0 auto; background:#0f172a; border:1px solid rgba(148,163,184,0.18); border-radius:24px; padding:32px;">
              <p style="font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#f59e0b; font-weight:700;">Expiry Warning</p>
              <h1 style="font-size:30px; line-height:1.1; margin:12px 0 16px;">Keep your AI access uninterrupted.</h1>
              <p style="color:#cbd5e1; line-height:1.7;">Hi ${subscription.name}, your access to <strong>${subscription.planName}</strong> expires on <strong>${formattedRenewalDate}</strong>. Renew now to keep learning without interruption.</p>
              <a href="${appUrl}/pricing" style="display:inline-block; background:#f97316; color:#fff; text-decoration:none; padding:14px 20px; border-radius:999px; font-weight:700;">Renew Access</a>
            </div>
          </div>
        `,
      };
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAdminUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const template = body.template as TemplateKey;
    const subscriptionIds = Array.isArray(body.subscriptionIds) ? body.subscriptionIds : [];

    if (!subscriptionIds.length) {
      return NextResponse.json({ error: "No subscriptions selected." }, { status: 400 });
    }

    if (!["renewal_reminder", "inactive_reactivation", "expiry_warning"].includes(template)) {
      return NextResponse.json({ error: "Invalid email template." }, { status: 400 });
    }

    const subscriptions = await prisma.userSubscription.findMany({
      where: { id: { in: subscriptionIds } },
      include: {
        user: { select: { name: true, email: true } },
        plan: true,
      },
    });

    if (!subscriptions.length) {
      return NextResponse.json({ error: "No matching subscriptions found." }, { status: 404 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.log("[bulk-email] Would send", template, "to", subscriptions.map((row) => row.user.email));

      await createAuditLog({
        actorId: adminUser.id,
        action: "user_subscription.bulk_email.previewed",
        entityType: "UserSubscription",
        summary: `Bulk email template ${template} prepared for ${subscriptions.length} subscribers.`,
        metadata: {
          template,
          subscriptionIds,
        },
      });

      return NextResponse.json({
        success: true,
        previewOnly: true,
        message: `Prepared ${subscriptions.length} email(s). RESEND_API_KEY is not configured, so nothing was sent.`,
      });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await Promise.all(
      subscriptions.map(async (subscription) => {
        const { subject, html } = buildEmailTemplate(template, {
          name: subscription.user.name || subscription.user.email || "Learner",
          email: subscription.user.email,
          planName: subscription.plan.name,
          billingCycle: subscription.billingCycle,
          currentPeriodEnd: subscription.currentPeriodEnd,
          revenue:
            subscription.billingCycle.toLowerCase() === "yearly"
              ? subscription.plan.yearlyPrice ?? subscription.plan.price
              : subscription.plan.price,
          currency: subscription.plan.currency,
        });

        return resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@aigeniuslab.com",
          to: subscription.user.email,
          subject,
          html,
        });
      })
    );

    await createAuditLog({
      actorId: adminUser.id,
      action: "user_subscription.bulk_email.sent",
      entityType: "UserSubscription",
      summary: `Bulk email template ${template} sent to ${subscriptions.length} subscribers.`,
      metadata: {
        template,
        subscriptionIds,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sent ${subscriptions.length} ${template.replace(/_/g, " ")} email(s).`,
    });
  } catch (error) {
    console.error("[bulk-email] Failed to send subscription email batch.", error);
    return NextResponse.json(
      { error: "Unable to send the selected subscription emails right now." },
      { status: 500 }
    );
  }
}

