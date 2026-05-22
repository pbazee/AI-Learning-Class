import "server-only";

import type { ReactElement } from "react";
import { Prisma } from "@prisma/client";
import { render } from "@react-email/render";
import { marked } from "marked";
import {
  EnrollmentEmail,
  MarketingNewsletterEmail,
  PasswordResetEmail,
  PaymentFailedEmail,
  PaymentReceiptEmail,
  WelcomeEmail,
} from "@/emails";
import { env } from "@/lib/config";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";

type SendEmailArgs = {
  to: string;
  subject: string;
  template: string;
  userId?: string | null;
  react: ReactElement;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  onError?: (error: unknown) => Promise<void> | void;
};

let resendClientPromise: Promise<InstanceType<typeof import("resend").Resend> | null> | null = null;

function toJsonValue(value?: Record<string, unknown>) {
  if (!value) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function getResendClient() {
  if (!env.RESEND_API_KEY) {
    return null;
  }

  if (!resendClientPromise) {
    resendClientPromise = import("resend").then(({ Resend }) => new Resend(env.RESEND_API_KEY));
  }

  return resendClientPromise;
}

async function getMailContext() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: {
      siteName: true,
      supportEmail: true,
    },
  });

  return {
    siteName: settings?.siteName?.trim() || "AI Genius Lab",
    supportEmail: settings?.supportEmail?.trim() || null,
    fromAddress: env.RESEND_FROM_EMAIL || settings?.supportEmail || "noreply@aigeniuslab.com",
    appUrl: env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };
}

async function logEmailEvent(input: {
  userId?: string | null;
  recipient: string;
  template: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  providerId?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.emailLog.create({
      data: {
        userId: input.userId ?? null,
        recipient: input.recipient,
        template: input.template,
        subject: input.subject,
        status: input.status,
        providerId: input.providerId ?? null,
        error: input.error ?? null,
        metadata: toJsonValue(input.metadata),
      },
    });
  } catch (error) {
    logger.error("[email] Failed to write email log.", error);
  }
}

export async function ensureEmailPreferenceForUser(userId: string) {
  await prisma.emailPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function sendEmail({ to, subject, template, userId, react, idempotencyKey, metadata, onError }: SendEmailArgs) {
  const resend = await getResendClient();

  if (!resend) {
    await logEmailEvent({
      userId,
      recipient: to,
      template,
      subject,
      status: "skipped",
      error: "RESEND_API_KEY is not configured.",
      metadata,
    });
    return { sent: false as const, reason: "RESEND_API_KEY is not configured." };
  }

  const { fromAddress } = await getMailContext();

  try {
    const html = await render(react);
    const result = await (resend.emails.send as any)(
      {
        from: fromAddress,
        to,
        subject,
        html,
      },
      {
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      }
    );

    await logEmailEvent({
      userId,
      recipient: to,
      template,
      subject,
      status: "sent",
      providerId: result.data?.id ?? null,
      metadata,
    });

    return { sent: true as const, id: result.data?.id ?? null };
  } catch (error) {
    captureException(error, {
      userId: userId ?? null,
      route: "email.send",
      extra: { template, recipient: to },
    });
    await onError?.(error);
    await logEmailEvent({
      userId,
      recipient: to,
      template,
      subject,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown email error",
      metadata,
    });
    throw error;
  }
}

export async function sendWelcomeEmail(input: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const context = await getMailContext();

  return sendEmail({
    to: input.email,
    userId: input.userId,
    subject: "Welcome to AI Genius Lab 🎉",
    template: "welcome",
    idempotencyKey: `welcome-${input.userId}`,
    metadata: { userId: input.userId },
    react: WelcomeEmail({
      name: input.name?.trim() || "",
      coursesHref: `${context.appUrl}/courses`,
    }),
  });
}

export async function sendPasswordResetEmail(input: {
  userId?: string | null;
  email: string;
  name?: string | null;
  resetHref: string;
}) {
  return sendEmail({
    to: input.email,
    userId: input.userId ?? null,
    subject: "Reset your password",
    template: "password_reset",
    idempotencyKey: `password-reset-${input.userId ?? input.email}-${input.resetHref}`,
    metadata: { resetHref: input.resetHref },
    react: PasswordResetEmail({
      name: input.name ?? undefined,
      resetHref: input.resetHref,
      expiresIn: "1 hour",
    }),
  });
}

export async function sendPaymentReceiptEmail(input: {
  userId: string;
  email: string;
  planName: string;
  amountLabel: string;
  nextBillingDate?: string | null;
  receiptHref?: string | null;
  orderId: string;
}) {
  const context = await getMailContext();

  return sendEmail({
    to: input.email,
    userId: input.userId,
    subject: `Your receipt — ${input.planName}`,
    template: "payment_receipt",
    idempotencyKey: `payment-receipt-${input.orderId}`,
    metadata: { orderId: input.orderId, planName: input.planName },
    react: PaymentReceiptEmail({
      planName: input.planName,
      amountLabel: input.amountLabel,
      nextBillingDate: input.nextBillingDate,
      receiptHref: input.receiptHref,
      supportEmail: context.supportEmail,
    }),
  });
}

export async function sendPaymentFailedEmail(input: {
  userId?: string | null;
  email: string;
  retryHref: string;
  orderId?: string | null;
}) {
  const context = await getMailContext();

  return sendEmail({
    to: input.email,
    userId: input.userId ?? null,
    subject: "Action needed: Payment failed",
    template: "payment_failed",
    idempotencyKey: `payment-failed-${input.orderId ?? input.email}`,
    metadata: { orderId: input.orderId ?? null, retryHref: input.retryHref },
    react: PaymentFailedEmail({
      retryHref: input.retryHref,
      supportEmail: context.supportEmail,
    }),
  });
}

export async function sendCourseEnrollmentEmail(input: {
  userId: string;
  email: string;
  courseName: string;
  courseHref: string;
  estimatedDuration?: string | null;
  orderId: string;
}) {
  return sendEmail({
    to: input.email,
    userId: input.userId,
    subject: `You're enrolled in ${input.courseName}`,
    template: "course_enrollment",
    idempotencyKey: `course-enrollment-${input.orderId}-${input.courseName}`,
    metadata: { orderId: input.orderId, courseName: input.courseName },
    react: EnrollmentEmail({
      courseName: input.courseName,
      courseHref: input.courseHref,
      estimatedDuration: input.estimatedDuration,
    }),
  });
}

export async function sendMarketingNewsletter(input: {
  userId: string;
  email: string;
  subject: string;
  html: string;
  previewText?: string;
}) {
  const context = await getMailContext();
  const preference = await prisma.emailPreference.findUnique({
    where: { userId: input.userId },
  });

  if (!preference?.subscribedMarketing) {
    await logEmailEvent({
      userId: input.userId,
      recipient: input.email,
      template: "newsletter",
      subject: input.subject,
      status: "skipped",
      error: "Marketing emails are disabled for this user.",
    });
    return { sent: false as const, reason: "unsubscribed" };
  }

  const renderedHtml = await marked.parse(input.html);

  return sendEmail({
    to: input.email,
    userId: input.userId,
    subject: input.subject,
    template: "newsletter",
    idempotencyKey: `newsletter-${input.userId}-${input.subject}`,
    metadata: { subject: input.subject },
    react: MarketingNewsletterEmail({
      subject: input.subject,
      previewText: input.previewText,
      html: renderedHtml,
      unsubscribeHref: `${context.appUrl}/unsubscribe?token=${preference.unsubscribeToken}`,
    }),
  });
}
