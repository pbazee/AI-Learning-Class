// src/app/api/email/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config";
import { logger } from "@/lib/logger";

type EmailType = "enrollment" | "certificate" | "welcome" | "admin_alert";

interface EmailPayload {
  type: EmailType;
  to: string;
  data: Record<string, string>;
}

function buildEmailHTML(type: EmailType, data: Record<string, string>): { subject: string; html: string } {
  const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #060614; color: #f9fafb;`;

  switch (type) {
    case "welcome":
      return {
        subject: `Welcome to AI Genius Lab, ${data.name}!`,
        html: `
          <div style="${baseStyle} padding: 40px 20px; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 900; background: linear-gradient(135deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                AI Genius Lab
              </h1>
            </div>
            <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">Welcome aboard, ${data.name}!</h2>
            <p style="color: #9ca3af; line-height: 1.6; margin-bottom: 24px;">
              You've joined 500,000+ AI learners worldwide. Your personalized learning path is ready.
            </p>
            <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #00d4ff, #7c3aed); color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">
              Start Learning
            </a>
          </div>
        `,
      };

    case "enrollment":
      return {
        subject: `You're enrolled in "${data.courseTitle}"`,
        html: `
          <div style="${baseStyle} padding: 40px 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 12px; color: #00d4ff;">Enrollment Confirmed!</h2>
            <p style="color: #9ca3af; margin-bottom: 8px;">Hi ${data.name},</p>
            <p style="color: #9ca3af; line-height: 1.6; margin-bottom: 24px;">
              You now have lifetime access to <strong style="color: white;">${data.courseTitle}</strong>. 
              Start learning at your own pace, anytime, anywhere.
            </p>
            <a href="${env.NEXT_PUBLIC_APP_URL}/courses/${data.courseSlug}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #00d4ff, #7c3aed); color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">
              Go to Course
            </a>
            <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
              Order ID: ${data.orderId} | Receipt: ${data.receiptUrl || "Sent separately"}
            </p>
          </div>
        `,
      };

    case "certificate":
      return {
        subject: `Your certificate for "${data.courseTitle}" is ready!`,
        html: `
          <div style="${baseStyle} padding: 40px 20px; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h2 style="font-size: 24px; font-weight: 900; color: #f59e0b;">Congratulations, ${data.name}!</h2>
              <p style="color: #9ca3af; margin-top: 8px;">You've completed <strong style="color: white;">${data.courseTitle}</strong></p>
            </div>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
              <p style="color: #9ca3af; font-size: 14px; margin-bottom: 8px;">Certificate Code</p>
              <p style="color: #00d4ff; font-family: monospace; font-size: 18px; font-weight: 700;">${data.certificateCode}</p>
            </div>
            <a href="${env.NEXT_PUBLIC_APP_URL}/certificates/${data.certificateCode}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">
              Download Certificate
            </a>
          </div>
        `,
      };

    case "admin_alert":
      return {
        subject: `[Admin Alert] ${data.alertType}`,
        html: `
          <div style="${baseStyle} padding: 32px 20px;">
            <h2 style="color: #ef4444;">Admin Alert: ${data.alertType}</h2>
            <pre style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; color: #9ca3af; font-size: 13px;">${JSON.stringify(data, null, 2)}</pre>
          </div>
        `,
      };

    default:
      return { subject: "AI Genius Lab", html: "<p>Notification from AI Genius Lab</p>" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload: EmailPayload = await req.json();

    if (!env.RESEND_API_KEY) {
      // Resend is not configured in this environment; log a safe preview.
      logger.info("[email] RESEND_API_KEY not configured; previewing email send", { type: payload.type, to: payload.to });
      return NextResponse.json({ sent: false, reason: "RESEND_API_KEY not configured" });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);

    const { subject, html } = buildEmailHTML(payload.type, payload.data);

    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL || "noreply@aigeniuslab.com",
      to: payload.to,
      subject,
      html,
    });

    return NextResponse.json({ sent: true, id: result.data?.id });
  } catch (error: any) {
    logger.error("Email send error:", error);
    return NextResponse.json({ sent: false, error: error.message }, { status: 500 });
  }
}

