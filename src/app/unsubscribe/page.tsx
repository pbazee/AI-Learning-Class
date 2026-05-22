import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const token = params?.token?.trim();
  let success = false;

  if (token) {
    const preference = await prisma.emailPreference.findFirst({
      where: { unsubscribeToken: token },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (preference) {
      await prisma.$transaction(async (tx) => {
        await tx.emailPreference.update({
          where: { userId: preference.userId },
          data: { subscribedMarketing: false },
        });

        await tx.newsletterSubscriber.updateMany({
          where: { email: preference.user.email },
          data: { isActive: false },
        });
      });

      success = true;
    }
  }

  return (
    <div className="site-shell">
      <div className="mx-auto flex min-h-[calc(100vh-var(--navbar-height))] max-w-2xl items-center px-4 py-16">
        <div className="surface-card w-full p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-blue">
            Email Preferences
          </p>
          <h1 className="mt-3 text-3xl font-black text-foreground">
            {success ? "You’ve been unsubscribed" : "We couldn’t verify that link"}
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {success
              ? "You will no longer receive marketing or newsletter emails from AI Genius Lab. Transactional messages like receipts and password resets will still be delivered when needed."
              : "This unsubscribe link is invalid or has already expired. If you still need help, contact support and we’ll update your preferences for you."}
          </p>
          <Link href="/" className="action-primary mt-6 inline-flex">
            Return to AI Genius Lab
          </Link>
        </div>
      </div>
    </div>
  );
}
