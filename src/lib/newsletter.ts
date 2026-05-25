import { ensureEmailPreferenceForUser } from "@/lib/email";
import { NEWSLETTER_OPT_IN_COOKIE } from "@/lib/newsletter-shared";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function subscribeEmailToNewsletter(input: {
  email: string;
  name?: string | null;
}) {
  const normalizedEmail = normalizeEmail(sanitizeText(input.email));
  const subscriberName =
    typeof input.name === "string" ? sanitizeText(input.name).trim() : "";

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  await prisma.newsletterSubscriber.upsert({
    where: { email: normalizedEmail },
    update: {
      isActive: true,
      name: subscriberName || undefined,
    },
    create: {
      email: normalizedEmail,
      name: subscriberName || undefined,
    },
  });

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (user) {
    await ensureEmailPreferenceForUser(user.id);
    await prisma.emailPreference.update({
      where: { userId: user.id },
      data: { subscribedMarketing: true },
    });
  }
}
