import { prisma } from "@/lib/prisma";
import { SubscriptionPlansManager } from "@/components/admin/subscription-plans-manager";

export default async function AdminSubscriptionsPage() {
  const plans = await prisma.subscriptionPlan.findMany({
    include: {
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
    orderBy: [{ price: "asc" }, { createdAt: "asc" }],
  });

  return (
    <SubscriptionPlansManager
      plans={plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price: plan.price,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.currency,
        features: plan.features,
        coursesIncluded: plan.coursesIncluded,
        isPopular: plan.isPopular,
        isActive: plan.isActive,
        subscriptionsCount: plan._count.subscriptions,
      }))}
    />
  );
}
