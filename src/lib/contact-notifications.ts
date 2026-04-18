import "server-only";

import { getPrimaryAdminEmail, normalizeEmail } from "@/lib/admin-email";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/config";
import { logger } from "@/lib/logger";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getNotificationContext() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: {
      siteName: true,
      supportEmail: true,
      adminEmail: true,
    },
  });

  const siteName = settings?.siteName?.trim() || "AI GENIUS LAB";
  const adminEmail = normalizeEmail(settings?.adminEmail) || getPrimaryAdminEmail();
  const supportEmail = normalizeEmail(settings?.supportEmail) || normalizeEmail(env.RESEND_FROM_EMAIL);
  const fromAddress = env.RESEND_FROM_EMAIL || settings?.supportEmail || "noreply@aigeniuslab.com";

  return {
    siteName,
    adminEmail,
    supportEmail,
    fromAddress,
  };
}

async function getResendClient() {
  if (!env.RESEND_API_KEY) {
    return null;
  }

  const { Resend } = await import("resend");
  return new Resend(env.RESEND_API_KEY);
}

export async function notifyAdminOfContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
}) {
  try {
    const resend = await getResendClient();
    if (!resend) {
      return { sent: false };
    }

    const { adminEmail, fromAddress, siteName } = await getNotificationContext();
    if (!adminEmail) {
      return { sent: false };
    }

    await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      replyTo: input.email,
      subject: `[${siteName}] New contact message: ${input.subject}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; margin: 0 auto; max-width: 720px; padding: 32px; background: #f7faff; color: #0f172a;">
          <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #0056d2;">
            ${escapeHtml(siteName)}
          </p>
          <h1 style="margin: 0 0 12px; font-size: 28px; line-height: 1.2; color: #020617;">New contact message</h1>
          <div style="border-radius: 24px; background: #ffffff; padding: 24px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);">
            <p style="margin: 0 0 8px;"><strong>Name:</strong> ${escapeHtml(input.name)}</p>
            <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
            <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
            <p style="margin: 0 0 8px;"><strong>Received:</strong> ${escapeHtml(input.createdAt.toISOString())}</p>
            <div style="margin-top: 18px; border-radius: 18px; background: #f8fafc; padding: 18px; line-height: 1.7; white-space: pre-wrap;">
              ${escapeHtml(input.message)}
            </div>
          </div>
        </div>
      `,
    });

    return { sent: true };
  } catch (error) {
    logger.error("[contact] Failed to notify admin.", error);
    return { sent: false };
  }
}

export async function notifyContactReply(input: {
  toEmail: string;
  toName: string;
  subject: string;
  replyBody: string;
}) {
  try {
    const resend = await getResendClient();
    if (!resend) {
      return { sent: false };
    }

    const { fromAddress, supportEmail, siteName } = await getNotificationContext();

    await resend.emails.send({
      from: fromAddress,
      to: input.toEmail,
      replyTo: supportEmail || fromAddress,
      subject: `Re: ${input.subject}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; margin: 0 auto; max-width: 720px; padding: 32px; background: #f7faff; color: #0f172a;">
          <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #0056d2;">
            ${escapeHtml(siteName)}
          </p>
          <h1 style="margin: 0 0 12px; font-size: 28px; line-height: 1.2; color: #020617;">Reply from ${escapeHtml(siteName)}</h1>
          <p style="margin: 0 0 18px; color: #334155;">
            Hi ${escapeHtml(input.toName)}, here is the latest response from our support team.
          </p>
          <div style="border-radius: 24px; background: #ffffff; padding: 24px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);">
            <p style="margin: 0 0 10px;"><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
            <div style="margin-top: 18px; border-radius: 18px; background: #f8fafc; padding: 18px; line-height: 1.7; white-space: pre-wrap;">
              ${escapeHtml(input.replyBody)}
            </div>
          </div>
        </div>
      `,
    });

    return { sent: true };
  } catch (error) {
    logger.error("[contact] Failed to send reply email.", error);
    return { sent: false };
  }
}

