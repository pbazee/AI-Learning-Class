import { prisma } from "@/lib/prisma";
import { SubscribersManager } from "@/components/admin/subscribers-manager";


const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminSubscribersPage() {
  const subscribers = await (async () => {
    try {
      return await prisma.newsletterSubscriber.findMany({
        orderBy: { subscribedAt: "desc" },
      });
    } catch (error) {
      console.error(
        "[database] admin subscribers query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return [];
    }
  })();

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
