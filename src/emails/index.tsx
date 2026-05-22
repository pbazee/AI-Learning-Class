import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type EmailShellProps = {
  preview: string;
  title: string;
  eyebrow?: string;
  intro: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryText?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
};

const palette = {
  background: "#f4f7fb",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#475569",
  accent: "#0056d2",
  accentSoft: "#e8f0ff",
  border: "#dbe7ff",
};

function EmailShell({
  preview,
  title,
  eyebrow = "AI Genius Lab",
  intro,
  ctaLabel,
  ctaHref,
  secondaryText,
  footer,
  children,
}: EmailShellProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: palette.background, margin: 0, padding: "24px 12px", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ maxWidth: "620px", margin: "0 auto", backgroundColor: palette.card, borderRadius: "24px", padding: "32px", border: `1px solid ${palette.border}` }}>
          <Text style={{ margin: 0, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: palette.accent, fontWeight: 700 }}>
            {eyebrow}
          </Text>
          <Heading style={{ margin: "16px 0 12px", color: palette.text, fontSize: "30px", lineHeight: "1.2", fontWeight: 800 }}>
            {title}
          </Heading>
          <Text style={{ margin: "0 0 20px", color: palette.muted, fontSize: "16px", lineHeight: "1.7" }}>
            {intro}
          </Text>

          {children ? (
            <Section style={{ backgroundColor: palette.accentSoft, borderRadius: "20px", padding: "20px 22px", marginBottom: "20px" }}>
              {children}
            </Section>
          ) : null}

          {ctaLabel && ctaHref ? (
            <Button
              href={ctaHref}
              style={{
                backgroundColor: palette.accent,
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: "14px",
                fontWeight: 700,
                padding: "14px 22px",
                display: "inline-block",
              }}
            >
              {ctaLabel}
            </Button>
          ) : null}

          {secondaryText ? (
            <Text style={{ margin: "18px 0 0", color: palette.muted, fontSize: "14px", lineHeight: "1.7" }}>
              {secondaryText}
            </Text>
          ) : null}

          <Hr style={{ borderColor: palette.border, margin: "28px 0 20px" }} />
          <Text style={{ margin: 0, color: palette.muted, fontSize: "12px", lineHeight: "1.7" }}>
            Need help? Reply to this email or contact support.
          </Text>
          {footer ? <Section style={{ marginTop: "16px" }}>{footer}</Section> : null}
        </Container>
      </Body>
    </Html>
  );
}

export function WelcomeEmail(props: { name: string; coursesHref: string; confirmNote?: string }) {
  return (
    <EmailShell
      preview="Welcome to AI Genius Lab"
      title={`Welcome to AI Genius Lab${props.name ? `, ${props.name}` : ""}`}
      intro="Your account is ready. Explore your courses, continue onboarding, and build practical AI skills at your own pace."
      ctaLabel="Browse courses"
      ctaHref={props.coursesHref}
      secondaryText={props.confirmNote ?? "If you still need to confirm your email, use the verification link we already sent to your inbox."}
    >
      <Text style={{ margin: 0, color: palette.text, fontSize: "15px", lineHeight: "1.7" }}>
        Start with hands-on lessons, track your progress, and return anytime from desktop or mobile.
      </Text>
    </EmailShell>
  );
}

export function PasswordResetEmail(props: { name?: string; resetHref: string; expiresIn: string }) {
  return (
    <EmailShell
      preview="Reset your AI Genius Lab password"
      title="Reset your password"
      intro={`Use the secure link below to choose a new password${props.name ? `, ${props.name}` : ""}.`}
      ctaLabel="Reset password"
      ctaHref={props.resetHref}
      secondaryText={`This link expires in ${props.expiresIn}. If you did not request a password reset, you can ignore this email.`}
    />
  );
}

export function PaymentReceiptEmail(props: {
  planName: string;
  amountLabel: string;
  nextBillingDate?: string | null;
  receiptHref?: string | null;
  supportEmail?: string | null;
}) {
  return (
    <EmailShell
      preview={`Your receipt for ${props.planName}`}
      title={`Your receipt — ${props.planName}`}
      intro="Thanks for your payment. Your access is active and your receipt details are below."
      ctaLabel={props.receiptHref ? "View receipt" : undefined}
      ctaHref={props.receiptHref ?? undefined}
      secondaryText={props.supportEmail ? `Questions about billing? Contact ${props.supportEmail}.` : undefined}
    >
      <Text style={{ margin: "0 0 8px", color: palette.text, fontSize: "15px", fontWeight: 700 }}>
        Plan: {props.planName}
      </Text>
      <Text style={{ margin: "0 0 8px", color: palette.text, fontSize: "15px" }}>
        Amount: {props.amountLabel}
      </Text>
      <Text style={{ margin: 0, color: palette.text, fontSize: "15px" }}>
        Next billing date: {props.nextBillingDate ?? "Not applicable"}
      </Text>
    </EmailShell>
  );
}

export function PaymentFailedEmail(props: { retryHref: string; supportEmail?: string | null }) {
  return (
    <EmailShell
      preview="Your payment could not be completed"
      title="Action needed: Payment failed"
      intro="We couldn't complete your latest payment. Use the retry link below to return to checkout and choose another method if needed."
      ctaLabel="Retry payment"
      ctaHref={props.retryHref}
      secondaryText={props.supportEmail ? `If you need help, contact ${props.supportEmail}.` : undefined}
    >
      <Text style={{ margin: 0, color: palette.text, fontSize: "15px", lineHeight: "1.7" }}>
        Common fixes include trying another card, checking available funds, or confirming your billing details.
      </Text>
    </EmailShell>
  );
}

export function EnrollmentEmail(props: {
  courseName: string;
  courseHref: string;
  estimatedDuration?: string | null;
}) {
  return (
    <EmailShell
      preview={`You're enrolled in ${props.courseName}`}
      title={`You're enrolled in ${props.courseName}`}
      intro="Your course access is active and ready to start."
      ctaLabel="Start course"
      ctaHref={props.courseHref}
      secondaryText={props.estimatedDuration ? `Estimated duration: ${props.estimatedDuration}.` : undefined}
    >
      <Text style={{ margin: 0, color: palette.text, fontSize: "15px", lineHeight: "1.7" }}>
        Jump in whenever you&apos;re ready. Your progress will stay synced across devices.
      </Text>
    </EmailShell>
  );
}

export function MarketingNewsletterEmail(props: {
  subject: string;
  previewText?: string;
  html: string;
  unsubscribeHref: string;
}) {
  return (
    <EmailShell
      preview={props.previewText || props.subject}
      title={props.subject}
      intro={props.previewText || "Latest updates from AI Genius Lab"}
      footer={
        <Text style={{ margin: 0, color: palette.muted, fontSize: "12px", lineHeight: "1.7" }}>
          You are receiving this marketing email because you opted in to AI Genius Lab updates.{" "}
          <Link href={props.unsubscribeHref} style={{ color: palette.accent }}>
            Unsubscribe instantly
          </Link>
          .
        </Text>
      }
    >
      <div dangerouslySetInnerHTML={{ __html: props.html }} />
    </EmailShell>
  );
}
