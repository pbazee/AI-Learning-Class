import { AdminCard, AdminPageIntro, AdminStatCard, AdminStatGrid, StatusPill } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminUserSubscriptionsPage() {
  const subscriptions = await prisma.userSubscription.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIALING"] },
    },
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

  const totalRevenue = subscriptions.reduce((sum, subscription) => {
    return (
      sum +
      (subscription.billingCycle.toLowerCase() === "yearly"
        ? subscription.plan.yearlyPrice ?? subscription.plan.price
        : subscription.plan.price)
    );
  }, 0);
  const monthlyRecurringRevenue = subscriptions.reduce((sum, subscription) => {
    const monthlyEquivalent =
      subscription.billingCycle.toLowerCase() === "yearly"
        ? (subscription.plan.yearlyPrice ?? subscription.plan.price) / 12
        : subscription.plan.price;

    return sum + monthlyEquivalent;
  }, 0);

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Revenue"
        title="User Subscriptions"
        description="Track only active paid learners, their plan access, renewal windows, and the courses bundled into each subscription."
      />

      <AdminStatGrid>
        <AdminStatCard label="Active Subscriptions" value={subscriptions.length} />
        <AdminStatCard label="MRR" value={formatPrice(monthlyRecurringRevenue)} accent="from-blue-500 to-cyan-400" />
        <AdminStatCard label="Contracted Revenue" value={formatPrice(totalRevenue)} accent="from-emerald-500 to-teal-400" />
        <AdminStatCard label="Countries" value={new Set(subscriptions.map((subscription) => subscription.user.country || "Unknown")).size} accent="from-violet-500 to-fuchsia-400" />
      </AdminStatGrid>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {["Subscriber", "Plan", "Period", "Revenue", "Courses Included", "Status"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {subscriptions.map((subscription) => {
                const revenueGenerated =
                  subscription.billingCycle.toLowerCase() === "yearly"
                    ? subscription.plan.yearlyPrice ?? subscription.plan.price
                    : subscription.plan.price;
                const coursesIncluded = subscription.plan.coursesIncluded.includes("ALL")
                  ? ["All published courses"]
                  : subscription.plan.coursesIncluded.map(
                      (courseId) => includedCourseMap.get(courseId) || courseId
                    );

                return (
                  <tr key={subscription.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-white">{subscription.user.name || "Unnamed user"}</p>
                        <p className="mt-1 text-xs text-slate-400">{subscription.user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{subscription.plan.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{subscription.billingCycle}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      {dateFormatter.format(subscription.currentPeriodStart)} to{" "}
                      {dateFormatter.format(subscription.currentPeriodEnd)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-white">
                      {formatPrice(revenueGenerated, subscription.plan.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-md space-y-2">
                        {coursesIncluded.map((course) => (
                          <div key={`${subscription.id}-${course}`} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                            {course}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill tone={subscription.status === "ACTIVE" ? "success" : "warning"}>
                        {subscription.status}
                      </StatusPill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
