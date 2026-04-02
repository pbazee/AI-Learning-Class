import { SubscriptionPlansManager } from "@/components/admin/subscription-plans-manager";
import { prisma } from "@/lib/prisma";
import { ensureSubscriptionPlansTable } from "@/lib/subscription-plans";

export default async function AdminSubscriptionsPage() {
  await ensureSubscriptionPlansTable();
  const managedPlans = await prisma.subscriptionPlan.findMany({
    orderBy: [{ price: "asc" }, { createdAt: "asc" }],
  });
  const subscriptionCounts = await prisma.userSubscription.groupBy({
    by: ["planId"],
    _count: {
      planId: true,
    },
    where: {
      planId: {
        in: managedPlans.map((plan) => plan.id),
      },
    },
  });
  const countByPlanId = new Map(
    subscriptionCounts.map((entry) => [entry.planId, entry._count.planId])
  );

  return (
    <SubscriptionPlansManager
      plans={managedPlans.map((plan) => ({
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
        subscriptionsCount: countByPlanId.get(plan.id) ?? 0,
      }))}
    />
  );
}
