import { prisma } from "@/lib/prisma";
import { SubscribersManager } from "@/components/admin/subscribers-manager";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminSubscribersPage() {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { subscribedAt: "desc" },
  });

  return (
    <SubscribersManager
      subscribers={subscribers.map((subscriber) => ({
        id: subscriber.id,
        email: subscriber.email,
        subscribedAt: dateFormatter.format(subscriber.subscribedAt),
        isActive: subscriber.isActive,
      }))}
    />
  );
}
