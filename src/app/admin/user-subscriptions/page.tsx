import { UserSubscriptionsManager } from "@/components/admin/user-subscriptions-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminUserSubscriptionsPage() {
  const subscriptions = await prisma.userSubscription.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          country: true,
        },
      },
      plan: true,
    },
    orderBy: { currentPeriodEnd: "asc" },
  });

  const userIds = subscriptions.map((subscription) => subscription.user.id);
  const lessonActivity = userIds.length
    ? await prisma.lessonProgress.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _max: { updatedAt: true },
      })
    : [];
  const lastActiveMap = new Map(
    lessonActivity.map((entry) => [entry.userId, entry._max.updatedAt?.toISOString() ?? null])
  );

  const includedCourseIds = Array.from(
    new Set(
      subscriptions.flatMap((subscription) =>
        subscription.plan.coursesIncluded.filter((courseId) => courseId !== "ALL")
      )
    )
  );
  const includedCourses = includedCourseIds.length
    ? await prisma.course.findMany({
        where: { id: { in: includedCourseIds } },
        select: {
          id: true,
          title: true,
        },
      })
    : [];
  const includedCourseMap = new Map(includedCourses.map((course) => [course.id, course.title]));

  return (
    <UserSubscriptionsManager
      subscriptions={subscriptions.map((subscription) => {
        const revenue =
          subscription.billingCycle.toLowerCase() === "yearly"
            ? subscription.plan.yearlyPrice ?? subscription.plan.price
            : subscription.plan.price;

        return {
          id: subscription.id,
          userId: subscription.user.id,
          userName: subscription.user.name || "Unnamed user",
          userEmail: subscription.user.email,
          userCountry: subscription.user.country || "Unknown",
          planName: subscription.plan.name,
          planCurrency: subscription.plan.currency,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          currentPeriodStart: subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          revenue,
          lastActiveAt: lastActiveMap.get(subscription.user.id) ?? null,
          coursesIncluded: subscription.plan.coursesIncluded.includes("ALL")
            ? ["All published courses"]
            : subscription.plan.coursesIncluded.map(
                (courseId) => includedCourseMap.get(courseId) || courseId
              ),
        };
      })}
    />
  );
}
